"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type AuthStep = "choose" | "phone" | "verify" | "guest";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (userId: string) => void;
}

export function AuthModal({ isOpen, onClose, onAuthenticated }: AuthModalProps) {
  const [step, setStep] = useState<AuthStep>("choose");
  const [phone, setPhone] = useState("+353 ");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handlePhoneSubmit = async () => {
    if (!phone.trim() || phone.trim().length < 8) {
      toast.error("Please enter a valid phone number.");
      return;
    }
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone: phone.trim(),
    });

    if (error) {
      toast.error(error.message || "Failed to send verification code.");
      setLoading(false);
      return;
    }

    toast.success("Verification code sent!");
    setStep("verify");
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length < 6) {
      toast.error("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone.trim(),
      token: otp.trim(),
      type: "sms",
    });

    if (error) {
      toast.error(error.message || "Invalid code. Please try again.");
      setLoading(false);
      return;
    }

    if (data.user) {
      onAuthenticated(data.user.id);
      onClose();
    }
    setLoading(false);
  };

  const handleGuestContinue = async () => {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      toast.error("Failed to create guest session.");
      setLoading(false);
      return;
    }

    if (data.user) {
      onAuthenticated(data.user.id);
      onClose();
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.href,
      },
    });

    if (error) {
      toast.error("Failed to start Google sign-in.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        {/* Close button */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === "choose" && "Sign In"}
            {step === "phone" && "Enter Phone Number"}
            {step === "verify" && "Verify Code"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === "choose" && (
          <div className="space-y-3">
            <p className="mb-4 text-sm text-gray-500">
              Sign in to manage your bookings, or continue as a guest.
            </p>

            <button
              onClick={() => setStep("phone")}
              className="flex w-full items-center gap-3 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
              Continue with Phone
            </button>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full items-center gap-3 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-gray-400">or</span>
              </div>
            </div>

            <button
              onClick={handleGuestContinue}
              disabled={loading}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              Continue as Guest
            </button>
          </div>
        )}

        {step === "phone" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              We&apos;ll send a verification code to your phone.
            </p>
            <div>
              <label htmlFor="authPhone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                id="authPhone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+353 87 123 4567"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[var(--brand-primary,#0074c5)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary,#0074c5)]"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep("choose")}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handlePhoneSubmit}
                disabled={loading}
                className="flex-1 rounded-lg bg-[var(--brand-primary,#0074c5)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Code"}
              </button>
            </div>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Enter the 6-digit code sent to {phone}.
            </p>
            <div>
              <label htmlFor="otpCode" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <input
                id="otpCode"
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-lg tracking-widest shadow-sm focus:border-[var(--brand-primary,#0074c5)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary,#0074c5)]"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setOtp("");
                  setStep("phone");
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleVerifyOtp}
                disabled={loading}
                className="flex-1 rounded-lg bg-[var(--brand-primary,#0074c5)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
