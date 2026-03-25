import { requireTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ServiceForm } from "@/components/admin/service-form";
import { Providers } from "@/components/providers";
import type { Service, Specialist } from "@clipbook/shared";

async function getService(id: string, tenantId: string): Promise<Service | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (error) return null;
  return data as Service;
}

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

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await requireTenant();
  const { id } = await params;
  const [service, specialists] = await Promise.all([
    getService(id, tenant.id),
    getActiveSpecialists(tenant.id),
  ]);

  if (!service) notFound();

  return (
    <Providers tenant={tenant}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Service</h1>
        <p className="mt-1 text-sm text-gray-500">
          Update {service.name}
        </p>
        <div className="mt-6">
          <ServiceForm
            tenantId={tenant.id}
            currency={tenant.currency}
            specialists={specialists}
            service={service}
          />
        </div>
      </div>
    </Providers>
  );
}
