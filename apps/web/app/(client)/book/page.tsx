import { getTenant } from "@/lib/tenant";
import { getSpecialist, getServices, getTenantSettings } from "@/lib/queries";
import { BookingFlow } from "@/components/booking-flow";
import { redirect } from "next/navigation";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ specialist?: string }>;
}) {
  const params = await searchParams;
  const specialistId = params.specialist;

  if (!specialistId) {
    redirect("/");
  }

  const tenant = await getTenant();
  if (!tenant) redirect("/");
  const [specialist, services, settings] = await Promise.all([
    getSpecialist(specialistId),
    getServices(tenant.id, specialistId),
    getTenantSettings(tenant.id),
  ]);

  if (!specialist) {
    redirect("/");
  }

  const granularity = settings.slot_granularity_min ?? 15;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <BookingFlow
        specialist={specialist}
        services={services}
        granularity={granularity}
      />
    </div>
  );
}
