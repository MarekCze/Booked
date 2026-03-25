import Link from "next/link";

const features = [
  {
    title: "Online Booking",
    description: "Clients book 24/7 from your custom-branded page. No phone calls needed.",
  },
  {
    title: "Real-Time Calendar",
    description: "Availability updates live as bookings happen. No double-bookings, ever.",
  },
  {
    title: "NFC Payments",
    description: "Accept tap-to-pay in your shop using your phone. No extra hardware needed.",
  },
  {
    title: "Team Profiles",
    description: "Showcase your specialists with photos, bios, and portfolio galleries.",
  },
  {
    title: "SMS Reminders",
    description: "Automatic appointment reminders reduce no-shows by up to 40%.",
  },
  {
    title: "Revenue Dashboard",
    description: "Track earnings, bookings, and performance by specialist or service.",
  },
];

const steps = [
  { step: "1", title: "Sign Up", description: "Create your account in under a minute." },
  { step: "2", title: "Set Up Your Shop", description: "Add your team, services, and schedule." },
  { step: "3", title: "Go Live", description: "Share your booking link and start taking appointments." },
];

export function MarketingHome() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-700 px-4 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Get your shop online in 5 minutes
          </h1>
          <p className="mt-6 text-lg text-gray-300">
            The booking engine built for barbers, hair salons, and beauty studios.
            Online bookings, NFC payments, and a branded page — all in one place.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="rounded-lg bg-white px-8 py-3 text-lg font-semibold text-gray-900 shadow-lg hover:bg-gray-50"
            >
              Sign Up Your Shop
            </Link>
            <Link
              href="/pricing"
              className="text-lg font-medium text-gray-300 hover:text-white"
            >
              View Pricing &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold text-gray-900">
          Everything your shop needs
        </h2>
        <p className="mt-4 text-center text-lg text-gray-500">
          No technical skills required. Set up once, run forever.
        </p>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            How it works
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-lg font-bold text-white">
                  {s.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500">{s.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/register"
              className="rounded-lg bg-gray-900 px-8 py-3 text-lg font-semibold text-white hover:bg-gray-800"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900">
          Ready to fill your chair?
        </h2>
        <p className="mt-4 text-lg text-gray-500">
          Join shops already using ClipBook to take bookings and get paid.
        </p>
        <Link
          href="/register"
          className="mt-8 inline-block rounded-lg bg-gray-900 px-8 py-3 text-lg font-semibold text-white hover:bg-gray-800"
        >
          Sign Up Your Shop
        </Link>
      </section>
    </div>
  );
}
