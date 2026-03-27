"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant-context";

interface ChecklistItem {
  key: string;
  label: string;
  href: string;
  complete: boolean;
}

interface OnboardingChecklistProps {
  hasSpecialists: boolean;
  hasServices: boolean;
  hasSchedule: boolean;
  stripeConnected: boolean;
  tenantSlug: string;
  onDismiss: () => void;
}

export function OnboardingChecklist({
  hasSpecialists,
  hasServices,
  hasSchedule,
  stripeConnected,
  tenantSlug,
  onDismiss,
}: OnboardingChecklistProps) {
  const tenant = useTenant();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const items: ChecklistItem[] = [
    {
      key: "specialists",
      label: "Add your first specialist",
      href: "/specialists",
      complete: hasSpecialists,
    },
    {
      key: "services",
      label: "Add at least one service",
      href: "/services",
      complete: hasServices,
    },
    {
      key: "schedule",
      label: "Set your schedule",
      href: "/schedule",
      complete: hasSchedule,
    },
    {
      key: "stripe",
      label: "Connect Stripe for payments",
      href: "/settings",
      complete: stripeConnected,
    },
    {
      key: "share",
      label: "Share your booking link",
      href: "#share",
      complete: false,
    },
  ];

  const completedCount = items.filter((i) => i.complete).length;
  const allDone = completedCount === items.length;

  const handleDismiss = async () => {
    try {
      const supabase = createClient();
      // Mark onboarding as complete in tenant settings via direct update
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("settings")
        .eq("id", tenant.id)
        .single();

      const currentSettings = tenantData?.settings || {};
      await supabase
        .from("tenants")
        .update({
          settings: { ...currentSettings, onboarding_complete: true },
        })
        .eq("id", tenant.id);
    } catch {
      // Non-critical — just dismiss locally
    }
    setDismissed(true);
    onDismiss();
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Get your shop ready
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {completedCount} of {items.length} complete
          </p>
        </div>
        {allDone && (
          <button
            onClick={handleDismiss}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
          >
            Dismiss
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2 rounded-full bg-gray-100">
        <div
          className="h-2 rounded-full bg-gray-900 transition-all"
          style={{ width: `${(completedCount / items.length) * 100}%` }}
        />
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50"
            >
              {item.complete ? (
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
              )}
              <span className={`text-sm ${item.complete ? "text-gray-400 line-through" : "text-gray-700"}`}>
                {item.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Share section */}
      <ShareBookingLink slug={tenantSlug} />
    </div>
  );
}

function ShareBookingLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  const bookingUrl = `${slug}.clipbook.io`;
  const fullUrl = `https://${bookingUrl}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Book your appointment at ${fullUrl}`)}`;
  const shareText = encodeURIComponent(`Book your appointment at ${fullUrl}`);

  return (
    <div id="share" className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-medium text-gray-700">Your booking link</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm text-gray-900">
          {bookingUrl}
        </code>
        <button
          onClick={handleCopy}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1fb855]"
        >
          Share on WhatsApp
        </a>
        <a
          href={`https://www.instagram.com/`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          Share on Instagram
        </a>
      </div>

      {/* QR Code placeholder — rendered via canvas in production with qrcode library */}
      <div className="mt-4">
        <p className="text-xs text-gray-500">
          Print a QR code for your shop window:
        </p>
        <div className="mt-2 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-4">
          <svg viewBox="0 0 100 100" className="h-24 w-24">
            {/* Simplified QR placeholder */}
            <rect x="0" y="0" width="100" height="100" fill="white" />
            <rect x="5" y="5" width="25" height="25" fill="black" />
            <rect x="70" y="5" width="25" height="25" fill="black" />
            <rect x="5" y="70" width="25" height="25" fill="black" />
            <rect x="10" y="10" width="15" height="15" fill="white" />
            <rect x="75" y="10" width="15" height="15" fill="white" />
            <rect x="10" y="75" width="15" height="15" fill="white" />
            <rect x="13" y="13" width="9" height="9" fill="black" />
            <rect x="78" y="13" width="9" height="9" fill="black" />
            <rect x="13" y="78" width="9" height="9" fill="black" />
            <text x="50" y="55" textAnchor="middle" fontSize="6" fill="black">QR</text>
          </svg>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Install the <code>qrcode</code> package for a real QR code.
        </p>
      </div>
    </div>
  );
}
