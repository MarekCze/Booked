import { requireTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { Providers } from "@/components/providers";
import { ReviewManagement } from "@/components/admin/review-management";
import type { Review } from "@clipbook/shared";

async function getAllReviews(tenantId: string): Promise<Review[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data as Review[];
}

export default async function ReviewsAdminPage() {
  const tenant = await requireTenant();
  const reviews = await getAllReviews(tenant.id);

  return (
    <Providers tenant={tenant}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage customer reviews. Approve reviews to display them on your website.
        </p>
        <div className="mt-6">
          <ReviewManagement initialReviews={reviews} tenantId={tenant.id} />
        </div>
      </div>
    </Providers>
  );
}
