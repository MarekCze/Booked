import Link from "next/link";
import { getTenant } from "@/lib/tenant";
import { getTenantSettings } from "@/lib/queries";
import { Providers } from "@/components/providers";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getTenant();

  // No tenant context — render marketing shell
  if (!tenant) {
    return (
      <div className="flex min-h-screen flex-col">
        {/* Marketing Nav */}
        <nav className="border-b border-gray-100 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-xl font-bold text-gray-900">
              ClipBook
            </Link>
            <div className="flex items-center gap-6">
              <Link
                href="/pricing"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Pricing
              </Link>
              <Link
                href="/owner-login"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Sign Up Your Shop
              </Link>
            </div>
          </div>
        </nav>

        <main className="flex-1">{children}</main>

        {/* Marketing Footer */}
        <footer className="border-t border-gray-100 bg-gray-50 px-4 py-8">
          <div className="mx-auto max-w-6xl text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} ClipBook. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }

  const settings = await getTenantSettings(tenant.id);
  const brandColor = settings?.branding?.primary_color || "#0074c5";

  return (
    <div
      style={{ "--brand-primary": brandColor } as React.CSSProperties}
      className="flex min-h-screen flex-col"
    >
      <Providers tenant={tenant}>
        <SiteNav />
        <main className="flex-1">{children}</main>
        <SiteFooter tenantName={tenant.name} social={settings?.social} />
      </Providers>
    </div>
  );
}
