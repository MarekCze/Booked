"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Review } from "@clipbook/shared";

interface ReviewManagementProps {
  initialReviews: Review[];
  tenantId: string;
}

export function ReviewManagement({ initialReviews, tenantId }: ReviewManagementProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");

  const toggleApproval = async (reviewId: string, currentlyApproved: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("reviews")
      .update({ is_approved: !currentlyApproved })
      .eq("id", reviewId);

    if (error) {
      toast.error("Failed to update review.");
      return;
    }

    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId ? { ...r, is_approved: !currentlyApproved } : r
      )
    );
    toast.success(currentlyApproved ? "Review hidden from website." : "Review approved and visible.");
  };

  const deleteReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to permanently delete this review?")) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", reviewId);

    if (error) {
      toast.error("Failed to delete review.");
      return;
    }

    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    toast.success("Review deleted.");
  };

  const filtered = reviews.filter((r) => {
    if (filter === "approved") return r.is_approved;
    if (filter === "pending") return !r.is_approved;
    return true;
  });

  const starDisplay = (rating: number) => {
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-IE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div>
      {/* Filter tabs */}
      <div className="mb-4 flex gap-2">
        {(["all", "approved", "pending"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === f
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-1 text-xs opacity-70">
              ({reviews.filter((r) => f === "all" ? true : f === "approved" ? r.is_approved : !r.is_approved).length})
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">No reviews to show.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => (
            <div
              key={review.id}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-amber-500 text-sm tracking-wider">
                      {starDisplay(review.rating)}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        review.is_approved
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {review.is_approved ? "Approved" : "Pending"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {review.author_name}
                  </p>
                  {review.text && (
                    <p className="mt-1 text-sm text-gray-600">{review.text}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    {formatDate(review.created_at)}
                  </p>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => toggleApproval(review.id, review.is_approved)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                      review.is_approved
                        ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    {review.is_approved ? "Reject" : "Approve"}
                  </button>
                  <button
                    onClick={() => deleteReview(review.id)}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
