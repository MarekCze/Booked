import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold text-gray-900">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          Start free. Only pay when you get paid.
        </p>
      </div>

      <div className="mx-auto mt-16 max-w-md">
        <div className="rounded-2xl border-2 border-gray-900 p-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Starter
          </h2>
          <div className="mt-4 flex items-baseline">
            <span className="text-5xl font-bold text-gray-900">Free</span>
            <span className="ml-2 text-gray-500">to set up</span>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            5% platform fee per online transaction. No monthly charges.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              "Branded booking page (yourshop.clipbook.io)",
              "Unlimited specialists",
              "Unlimited services",
              "Online payments via Stripe",
              "NFC tap-to-pay in-shop",
              "Real-time availability calendar",
              "SMS appointment reminders",
              "Revenue dashboard",
              "Client booking history",
              "No-show tracking",
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <svg
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-900"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
                <span className="text-sm text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/register"
            className="mt-8 block rounded-lg bg-gray-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-gray-800"
          >
            Get Started
          </Link>
        </div>

        <p className="mt-8 text-center text-sm text-gray-400">
          Need a custom domain or higher volume? Contact us for enterprise pricing.
        </p>
      </div>
    </div>
  );
}
