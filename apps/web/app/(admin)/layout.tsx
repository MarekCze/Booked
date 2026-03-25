import { getTenant } from "@/lib/tenant";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getTenant();
  if (!tenant) redirect("/");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin navbar */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-gray-900">
              {tenant.name}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a
              href="/dashboard"
              className="font-medium text-gray-900 hover:text-[var(--brand-primary,#0074c5)]"
            >
              Dashboard
            </a>
            <a
              href="/"
              className="text-gray-500 hover:text-gray-700"
            >
              View Site
            </a>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
