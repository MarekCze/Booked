import { requireTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { Providers } from "@/components/providers";
import { SettingsForm } from "@/components/admin/settings-form";
import type { Tenant } from "@clipbook/shared";

async function getTenantFull(tenantId: string): Promise<Tenant | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();

  if (error) return null;
  return data as Tenant;
}

export default async function SettingsPage() {
  const tenant = await requireTenant();
  const tenantFull = await getTenantFull(tenant.id);

  if (!tenantFull) return null;

  return (
    <Providers tenant={tenant}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your shop configuration
        </p>
        <div className="mt-6">
          <SettingsForm tenant={tenantFull} />
        </div>
      </div>
    </Providers>
  );
}
