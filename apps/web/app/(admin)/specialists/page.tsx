import { requireTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Specialist } from "@clipbook/shared";
import { SpecialistList } from "@/components/admin/specialist-list";
import { Providers } from "@/components/providers";

async function getAllSpecialists(tenantId: string): Promise<Specialist[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("specialists")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("display_order");

  if (error) throw error;
  return data as Specialist[];
}

export default async function SpecialistsPage() {
  const tenant = await requireTenant();
  const specialists = await getAllSpecialists(tenant.id);

  return (
    <Providers tenant={tenant}>
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Specialists</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your team members
            </p>
          </div>
          <Link
            href="/specialists/new"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Add Specialist
          </Link>
        </div>

        <div className="mt-6">
          <SpecialistList
            initialSpecialists={specialists}
            tenantId={tenant.id}
          />
        </div>
      </div>
    </Providers>
  );
}
