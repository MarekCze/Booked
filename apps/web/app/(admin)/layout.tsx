import { getTenant } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { Providers } from "@/components/providers";
import { createClient } from "@/lib/supabase/server";

async function getAdminMember(tenantId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("tenant_members")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .single();

  return data;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getTenant();
  if (!tenant) redirect("/");

  const member = await getAdminMember(tenant.id);

  // If not a member and not on the login page, redirect to login
  // The login page itself handles rendering without auth
  if (!member) {
    return (
      <Providers tenant={tenant}>
        <div className="min-h-screen bg-gray-50">{children}</div>
      </Providers>
    );
  }

  return (
    <Providers tenant={tenant}>
      <AdminShell
        tenantName={tenant.name}
        role={member.role}
      >
        {children}
      </AdminShell>
    </Providers>
  );
}
