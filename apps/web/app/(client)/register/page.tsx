"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const RESERVED_SLUGS = new Set([
  "www", "app", "api", "admin", "dashboard", "billing",
  "support", "help", "status", "docs", "mail", "ftp",
  "register", "login", "signup", "signin",
]);

const SLUG_REGEX = /^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])?$/;

const TIMEZONES = [
  "Europe/Dublin", "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Europe/Rome", "Europe/Madrid", "Europe/Amsterdam", "Europe/Brussels",
  "Europe/Lisbon", "Europe/Warsaw", "Europe/Prague", "Europe/Vienna",
  "Europe/Stockholm", "Europe/Helsinki", "Europe/Athens",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Australia/Sydney", "Asia/Tokyo",
];

const CURRENCIES = ["EUR", "GBP", "USD", "AUD", "CAD", "NZD"];

type Step = 1 | 2 | 3 | 4;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export default function RegisterPage() {
  const supabase = createClient();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2
  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [timezone, setTimezone] = useState("Europe/Dublin");
  const [currency, setCurrency] = useState("EUR");

  // Results
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string>("");

  useEffect(() => {
    if (!slugManuallyEdited && shopName) {
      setSlug(slugify(shopName));
    }
  }, [shopName, slugManuallyEdited]);

  const validateSlug = useCallback(async (value: string) => {
    if (!value || value.length < 3) { setSlugStatus("invalid"); return; }
    if (!SLUG_REGEX.test(value)) { setSlugStatus("invalid"); return; }
    if (RESERVED_SLUGS.has(value)) { setSlugStatus("taken"); return; }

    setSlugStatus("checking");
    const { data } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", value)
      .maybeSingle();
    setSlugStatus(data ? "taken" : "available");
  }, [supabase]);

  useEffect(() => {
    if (!slug) { setSlugStatus("idle"); return; }
    const timer = setTimeout(() => validateSlug(slug), 400);
    return () => clearTimeout(timer);
  }, [slug, validateSlug]);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: ownerName } },
    });

    if (signUpError) {
      if (signUpError.message.includes("already registered")) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) { setError(signInError.message); setLoading(false); return; }
      } else {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (slugStatus !== "available") { setError("Please choose an available slug."); return; }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Session expired. Please go back and sign in."); setLoading(false); return; }

    const { data, error: fnError } = await supabase.functions.invoke("register-tenant", {
      body: { user_id: user.id, shop_name: shopName, slug, timezone, currency },
    });

    if (fnError) { setError(fnError.message || "Registration failed."); setLoading(false); return; }

    setTenantId(data.tenant_id);
    setTenantSlug(slug);
    setLoading(false);
    setStep(3);
  };

  const handleStripeOnboard = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke("stripe-connect-onboard", {
      body: { tenant_id: tenantId },
    });
    if (fnError || !data?.url) {
      setError("Could not start Stripe onboarding. You can set this up later.");
      setLoading(false);
      return;
    }
    window.location.href = data.url;
  };

  const getShopUrl = () => {
    const host = window.location.host;
    const parts = host.split(".");
    const baseDomain = parts.length > 1 ? parts.slice(1).join(".") : host;
    return `${window.location.protocol}//${tenantSlug}.${baseDomain}`;
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-2 w-12 rounded-full ${s <= step ? "bg-gray-900" : "bg-gray-200"}`} />
          ))}
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
              <p className="mt-1 text-sm text-gray-500">Step 1 of 4</p>
            </div>
            <div>
              <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700">Your Name</label>
              <input id="ownerName" type="text" required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" placeholder="Joe Smith" />
            </div>
            <div>
              <label htmlFor="regEmail" className="block text-sm font-medium text-gray-700">Email</label>
              <input id="regEmail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" placeholder="joe@example.com" />
            </div>
            <div>
              <label htmlFor="regPassword" className="block text-sm font-medium text-gray-700">Password</label>
              <input id="regPassword" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" placeholder="At least 8 characters" />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
              {loading ? "Creating account..." : "Continue"}
            </button>
            <p className="text-center text-sm text-gray-500">
              Already have an account? <Link href="/owner-login" className="font-medium text-gray-900 hover:underline">Log in</Link>
            </p>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">Set up your shop</h1>
              <p className="mt-1 text-sm text-gray-500">Step 2 of 4</p>
            </div>
            <div>
              <label htmlFor="shopName" className="block text-sm font-medium text-gray-700">Shop Name</label>
              <input id="shopName" type="text" required value={shopName} onChange={(e) => setShopName(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" placeholder="Joe's Barbers" />
            </div>
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700">Shop URL</label>
              <div className="mt-1 flex items-center">
                <input id="slug" type="text" required value={slug} onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugManuallyEdited(true); }} className="block w-full rounded-l-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" placeholder="joes-barbers" />
                <span className="inline-flex items-center rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">.clipbook.io</span>
              </div>
              <div className="mt-1 h-5">
                {slugStatus === "checking" && <p className="text-xs text-gray-400">Checking...</p>}
                {slugStatus === "available" && <p className="text-xs text-green-600">Available!</p>}
                {slugStatus === "taken" && <p className="text-xs text-red-600">Already taken.</p>}
                {slugStatus === "invalid" && slug.length > 0 && <p className="text-xs text-red-600">3-50 chars, lowercase letters, numbers, hyphens.</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">Timezone</label>
                <select id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900">
                  {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700">Currency</label>
                <select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900">
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" disabled={loading || slugStatus !== "available"} className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
              {loading ? "Creating shop..." : "Create Shop"}
            </button>
            <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-gray-500 hover:text-gray-700">&larr; Back</button>
          </form>
        )}

        {step === 3 && (
          <div className="space-y-6 text-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Connect payments</h1>
              <p className="mt-1 text-sm text-gray-500">Step 3 of 4 (optional)</p>
            </div>
            <p className="text-sm text-gray-600">
              Connect Stripe to accept online payments and NFC tap-to-pay. You can set this up later.
            </p>
            <button onClick={handleStripeOnboard} disabled={loading} className="w-full rounded-lg bg-[#635bff] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#5147e5] disabled:opacity-50">
              {loading ? "Connecting..." : "Connect with Stripe"}
            </button>
            <button onClick={() => setStep(4)} className="w-full text-sm text-gray-500 hover:text-gray-700">Skip for now &rarr;</button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Your shop is live!</h1>
              <p className="mt-2 text-sm text-gray-500">Clients can find you at:</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{tenantSlug}.clipbook.io</p>
            </div>
            <div className="space-y-3">
              <a href={`${getShopUrl()}/dashboard`} className="block rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800">Go to Dashboard</a>
              <a href={getShopUrl()} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Preview Your Shop</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
