"use client";

import { TenantProvider } from "@/lib/tenant-context";
import type { TenantContext } from "@/lib/tenant";
import { Toaster } from "sonner";

export function Providers({
  tenant,
  children,
}: {
  tenant: TenantContext;
  children: React.ReactNode;
}) {
  return (
    <TenantProvider value={tenant}>
      {children}
      <Toaster position="top-center" />
    </TenantProvider>
  );
}
