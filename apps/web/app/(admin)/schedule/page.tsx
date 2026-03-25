import { requireTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { Providers } from "@/components/providers";
import { ScheduleEditor } from "@/components/admin/schedule-editor";
import type { Specialist, ScheduleTemplate } from "@clipbook/shared";

async function getActiveSpecialists(tenantId: string): Promise<Specialist[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("specialists")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;
  return data as Specialist[];
}

async function getScheduleTemplates(
  tenantId: string
): Promise<ScheduleTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule_templates")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("day_of_week");

  if (error) throw error;
  return data as ScheduleTemplate[];
}

export default async function SchedulePage() {
  const tenant = await requireTenant();
  const [specialists, templates] = await Promise.all([
    getActiveSpecialists(tenant.id),
    getScheduleTemplates(tenant.id),
  ]);

  return (
    <Providers tenant={tenant}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <p className="mt-1 text-sm text-gray-500">
          Set weekly working hours for each specialist
        </p>
        <div className="mt-6">
          <ScheduleEditor
            specialists={specialists}
            initialTemplates={templates}
            tenantId={tenant.id}
          />
        </div>
      </div>
    </Providers>
  );
}
