import { requireTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Service, Specialist } from "@clipbook/shared";
import { formatPrice } from "@/lib/format";
import { formatDuration } from "@/lib/format";

async function getAllServices(tenantId: string): Promise<Service[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) throw error;
  return data as Service[];
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

export default async function ServicesPage() {
  const tenant = await requireTenant();
  const [services, specialists] = await Promise.all([
    getAllServices(tenant.id),
    getActiveSpecialists(tenant.id),
  ]);

  const specialistMap = Object.fromEntries(
    specialists.map((s) => [s.id, s.name])
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your service offerings
          </p>
        </div>
        <Link
          href="/services/new"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Add Service
        </Link>
      </div>

      <div className="mt-6">
        {services.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-500">No services yet.</p>
            <Link
              href="/services/new"
              className="mt-3 inline-block text-sm font-medium text-gray-900 underline hover:no-underline"
            >
              Add your first service
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Service
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Specialist
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {service.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDuration(service.duration_min)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatPrice(service.price_cents, tenant.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {service.specialist_id
                        ? specialistMap[service.specialist_id] || "Unknown"
                        : "All Specialists"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          service.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {service.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/services/${service.id}`}
                        className="text-sm font-medium text-gray-600 hover:text-gray-900"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
