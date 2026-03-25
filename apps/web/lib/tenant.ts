import { headers } from "next/headers";

export interface TenantContext {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  currency: string;
}

/**
 * Get the current tenant context from request headers.
 * Must be called from a Server Component or Route Handler.
 * Returns null if no tenant is resolved (e.g., marketing site).
 */
export async function getTenant(): Promise<TenantContext | null> {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id");

  if (!tenantId) return null;

  return {
    id: tenantId,
    slug: headersList.get("x-tenant-slug") || "",
    name: headersList.get("x-tenant-name") || "",
    timezone: headersList.get("x-tenant-timezone") || "Europe/Dublin",
    currency: headersList.get("x-tenant-currency") || "EUR",
  };
}

/**
 * Get tenant ID or throw if not in a tenant context.
 */
export async function requireTenant(): Promise<TenantContext> {
  const tenant = await getTenant();
  if (!tenant) {
    throw new Error("No tenant context. This page requires a tenant subdomain.");
  }
  return tenant;
}

/**
 * Check if the current request is on the marketing site (no tenant subdomain).
 */
export async function isMarketingSite(): Promise<boolean> {
  const headersList = await headers();
  return headersList.get("x-is-marketing") === "true";
}
