import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Domains that should skip tenant resolution
const SKIP_SUBDOMAINS = new Set(["www", "app", ""]);

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0]; // Remove port for localhost

  // Extract subdomain
  // Handles: slug.clipbook.io, slug.localhost
  const parts = hostname.split(".");
  const subdomain = parts.length > 1 ? parts[0] : "";

  // Skip tenant resolution for non-tenant subdomains
  if (SKIP_SUBDOMAINS.has(subdomain)) {
    return NextResponse.next();
  }

  // Create Supabase client for tenant lookup
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Look up tenant by slug
  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("id, slug, name, timezone, currency, settings")
    .eq("slug", subdomain)
    .single();

  if (error || !tenant) {
    // Tenant not found — show 404
    const url = request.nextUrl.clone();
    url.pathname = "/not-found";
    return NextResponse.rewrite(url);
  }

  // Inject tenant context into request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", tenant.id);
  requestHeaders.set("x-tenant-slug", tenant.slug);
  requestHeaders.set("x-tenant-name", tenant.name);
  requestHeaders.set("x-tenant-timezone", tenant.timezone);
  requestHeaders.set("x-tenant-currency", tenant.currency);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    // Match all paths except static files and API routes
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
