import { requireTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { SpecialistForm } from "@/components/admin/specialist-form";
import { Providers } from "@/components/providers";
import type { Specialist } from "@clipbook/shared";

async function getSpecialist(
  id: string,
  tenantId: string
): Promise<Specialist | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("specialists")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (error) return null;
  return data as Specialist;
}

export default async function EditSpecialistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await requireTenant();
  const { id } = await params;
  const specialist = await getSpecialist(id, tenant.id);

  if (!specialist) notFound();

  return (
    <Providers tenant={tenant}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Specialist</h1>
        <p className="mt-1 text-sm text-gray-500">
          Update {specialist.name}&apos;s profile
        </p>
        <div className="mt-6">
          <SpecialistForm tenantId={tenant.id} specialist={specialist} />
        </div>
      </div>
    </Providers>
  );
}
