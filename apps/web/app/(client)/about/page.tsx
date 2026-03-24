import { getTenant } from "@/lib/tenant";
import { getTenantSettings, getSpecialists } from "@/lib/queries";
import { redirect } from "next/navigation";

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = ["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default async function AboutPage() {
  const tenant = await getTenant();
  if (!tenant) redirect("/");

  const [settings, specialists] = await Promise.all([
    getTenantSettings(tenant.id),
    getSpecialists(tenant.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900">About {tenant.name}</h1>

      {settings?.about?.description && (
        <p className="mt-4 text-lg leading-relaxed text-gray-600">
          {settings.about.description}
        </p>
      )}

      {/* Team Section */}
      <h2 className="mt-12 text-2xl font-bold text-gray-900">Our Team</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {specialists.map((specialist) => (
          <div key={specialist.id} className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white ${getAvatarColor(specialist.name)}`}
              >
                {specialist.photo_url ? (
                  <img
                    src={specialist.photo_url}
                    alt={specialist.name}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  getInitials(specialist.name)
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{specialist.name}</h3>
              </div>
            </div>
            {specialist.bio && (
              <p className="mt-3 text-sm text-gray-600">{specialist.bio}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
