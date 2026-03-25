import { requireTenant } from "@/lib/tenant";
import { SpecialistForm } from "@/components/admin/specialist-form";
import { Providers } from "@/components/providers";

export default async function NewSpecialistPage() {
  const tenant = await requireTenant();

  return (
    <Providers tenant={tenant}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Specialist</h1>
        <p className="mt-1 text-sm text-gray-500">
          Add a new team member to your shop
        </p>
        <div className="mt-6">
          <SpecialistForm tenantId={tenant.id} />
        </div>
      </div>
    </Providers>
  );
}
