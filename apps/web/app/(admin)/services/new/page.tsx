import { requireTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { ServiceForm } from "@/components/admin/service-form";
import { Providers } from "@/components/providers";
import type { Specialist } from "@clipbook/shared";

async function getActiveSpecialists(tenantId: string): Promise<Specialist[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("specialists")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;
  return data as Specialist[];
}

export default async function NewServicePage() {
  const tenant = await requireTenant();
  const specialists = await getActiveSpecialists(tenant.id);

  return (
    <Providers tenant={tenant}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Service</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a new service offering
        </p>
        <div className="mt-6">
          <ServiceForm
            tenantId={tenant.id}
            currency={tenant.currency}
            specialists={specialists}
          />
        </div>
      </div>
    </Providers>
  );
}
