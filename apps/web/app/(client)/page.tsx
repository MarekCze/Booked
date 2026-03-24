import Link from "next/link";
import { getTenant } from "@/lib/tenant";
import {
  getSpecialists,
  getNextAvailable,
  getTenantSettings,
  getAllServices,
  getReviews,
} from "@/lib/queries";
import { SpecialistCarousel } from "@/components/specialist-carousel";
import { ReviewCard } from "@/components/review-card";
import { formatPrice, formatDuration } from "@/lib/format";

export default async function HomePage() {
  const tenant = await getTenant();
  if (!tenant) return null;

  const [specialists, settings, services, reviews] = await Promise.all([
    getSpecialists(tenant.id),
    getTenantSettings(tenant.id),
    getAllServices(tenant.id),
    getReviews(tenant.id),
  ]);

  const specialistsWithAvailability = await Promise.all(
    specialists.map(async (specialist) => ({
      specialist,
      nextAvailable: await getNextAvailable(specialist.id),
    }))
  );

  const homepage = settings?.homepage;
  const topServices = services.slice(0, 6);
  const latestReviews = reviews.slice(0, 3);

  return (
    <div>
      {/* Hero Section */}
      <section
        className="relative flex flex-col items-center justify-center px-4 py-20 text-center"
        style={{
          background: homepage?.hero_image_url
            ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${homepage.hero_image_url}) center/cover`
            : `linear-gradient(135deg, var(--brand-primary, #0074c5), #1e293b)`,
        }}
      >
        <h1 className="text-4xl font-bold text-white sm:text-5xl">
          {homepage?.title || tenant.name}
        </h1>
        {(homepage?.subtitle) && (
          <p className="mt-4 max-w-xl text-lg text-white/80">
            {homepage.subtitle}
          </p>
        )}
        <Link
          href="/book"
          className="mt-8 inline-block rounded-lg bg-white px-8 py-3 text-lg font-semibold text-gray-900 shadow-lg hover:bg-gray-50"
        >
          {homepage?.cta_text || "Book Now"}
        </Link>
      </section>

      {/* Specialists */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">
          Meet Our Team
        </h2>
        <SpecialistCarousel specialists={specialistsWithAvailability} />
      </section>

      {/* Services Preview */}
      {topServices.length > 0 && (
        <section className="bg-gray-50 px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">
              Our Services
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topServices.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div>
                    <p className="font-medium text-gray-900">{service.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatDuration(service.duration_min)}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatPrice(service.price_cents, tenant.currency)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link
                href="/book"
                className="text-sm text-[var(--brand-primary,#0074c5)] hover:underline"
              >
                View all services & book &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Reviews Teaser */}
      {latestReviews.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">
            What Our Clients Say
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latestReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/reviews"
              className="text-sm text-[var(--brand-primary,#0074c5)] hover:underline"
            >
              Read all reviews &rarr;
            </Link>
          </div>
        </section>
      )}

      {/* CTA Footer */}
      <section className="bg-[var(--brand-primary,#0074c5)] px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-white">Ready to book?</h2>
        <p className="mt-2 text-white/80">
          Choose your specialist and pick a time that works for you.
        </p>
        <Link
          href="/book"
          className="mt-6 inline-block rounded-lg bg-white px-8 py-3 font-semibold text-gray-900 hover:bg-gray-50"
        >
          Book an Appointment
        </Link>
      </section>
    </div>
  );
}
