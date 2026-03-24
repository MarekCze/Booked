import type { Review } from "@clipbook/shared";
import { StarRating } from "./star-rating";

export function ReviewCard({ review }: { review: Review }) {
  const date = new Date(review.created_at);
  const timeAgo = getRelativeTime(date);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StarRating rating={review.rating} />
          <span className="text-sm font-medium text-gray-900">
            {review.author_name}
          </span>
        </div>
        <span className="text-xs text-gray-400">{timeAgo}</span>
      </div>
      {review.text && (
        <p className="mt-2 text-sm text-gray-600">{review.text}</p>
      )}
    </div>
  );
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
