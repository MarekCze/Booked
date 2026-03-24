import { getTenant } from "@/lib/tenant";
import { getReviews, getAverageRating } from "@/lib/queries";
import { ReviewCard } from "@/components/review-card";
import { StarRating } from "@/components/star-rating";
import { redirect } from "next/navigation";

export default async function ReviewsPage() {
  const tenant = await getTenant();
  if (!tenant) redirect("/");

  const [reviews, { average, count }] = await Promise.all([
    getReviews(tenant.id),
    getAverageRating(tenant.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900">Reviews</h1>

      {count > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <StarRating rating={Math.round(average)} size="lg" />
          <span className="text-lg font-semibold text-gray-900">
            {average.toFixed(1)}
          </span>
          <span className="text-sm text-gray-500">
            ({count} {count === 1 ? "review" : "reviews"})
          </span>
        </div>
      )}

      {reviews.length > 0 ? (
        <div className="mt-8 space-y-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-400">No reviews yet</p>
        </div>
      )}
    </div>
  );
}
