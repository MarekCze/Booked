import Link from "next/link";
import { getTenant } from "@/lib/tenant";
import { getSpecialist, getServices, getReviews, getAverageRating } from "@/lib/queries";
import { ReviewCard } from "@/components/review-card";
import { StarRating } from "@/components/star-rating";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDuration } from "@/lib/format";
import { redirect, notFound } from "next/navigation";
import { GalleryGrid } from "../../gallery/gallery-grid";
import type { PortfolioImage } from "@clipbook/shared";

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = ["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default async function SpecialistProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getTenant();
  if (!tenant) redirect("/");

  const specialist = await getSpecialist(id);
  if (!specialist) notFound();

  const [services, reviews, { average, count }] = await Promise.all([
    getServices(tenant.id, id),
    getReviews(tenant.id, id),
    getAverageRating(tenant.id, id),
  ]);

  const portfolio = (specialist.portfolio_images ?? []) as PortfolioImage[];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Header */}
      <div className="flex items-start gap-5">
        <div
          className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white ${getAvatarColor(specialist.name)}`}
        >
          {specialist.photo_url ? (
            <img
              src={specialist.photo_url}
              alt={specialist.name}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            getInitials(specialist.name)
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{specialist.name}</h1>
          {count > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <StarRating rating={Math.round(average)} />
              <span className="text-sm text-gray-500">
                {average.toFixed(1)} ({count} {count === 1 ? "review" : "reviews"})
              </span>
            </div>
          )}
          {specialist.bio && (
            <p className="mt-3 text-gray-600">{specialist.bio}</p>
          )}
          <Link
            href={`/book?specialist=${specialist.id}`}
            className="mt-4 inline-block rounded-lg bg-[var(--brand-primary,#0074c5)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            Book with {specialist.name.split(" ")[0]}
          </Link>
        </div>
      </div>

      {/* Services */}
      {services.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-gray-900">Services</h2>
          <div className="mt-4 space-y-2">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{service.name}</span>
                  <Badge variant="duration">{formatDuration(service.duration_min)}</Badge>
                </div>
                <span className="font-semibold text-gray-900">
                  {formatPrice(service.price_cents, tenant.currency)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Portfolio */}
      {portfolio.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-gray-900">Portfolio</h2>
          <div className="mt-4">
            <GalleryGrid images={portfolio} />
          </div>
        </section>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-gray-900">Reviews</h2>
          <div className="mt-4 space-y-4">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </section>
      )}

      {/* Book CTA */}
      <div className="mt-12 text-center">
        <Link
          href={`/book?specialist=${specialist.id}`}
          className="inline-block rounded-lg bg-[var(--brand-primary,#0074c5)] px-8 py-3 font-semibold text-white hover:opacity-90"
        >
          Book with {specialist.name.split(" ")[0]}
        </Link>
      </div>
    </div>
  );
}
