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

  // No tenant context (bare domain / marketing site) — render minimal shell
  if (!tenant) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <h1 className="text-4xl font-bold">ClipBook</h1>
        <p className="mt-4 text-lg text-gray-600">
          Booking engine for barbers, hair &amp; beauty salons
        </p>
        <p className="mt-2 text-sm text-gray-400">
          Visit your shop&apos;s subdomain to book an appointment.
        </p>
      </main>
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
