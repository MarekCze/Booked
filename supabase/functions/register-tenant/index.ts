import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESERVED_SLUGS = new Set([
  "www", "app", "api", "admin", "dashboard", "billing",
  "support", "help", "status", "docs", "mail", "ftp",
  "register", "login", "signup", "signin",
]);

const SLUG_REGEX = /^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])?$/;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, shop_name, slug, timezone, currency } = await req.json();

    // Validate inputs
    if (!user_id || !shop_name || !slug || !timezone || !currency) {
      return new Response(
        JSON.stringify({ error: "Missing required fields." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SLUG_REGEX.test(slug)) {
      return new Response(
        JSON.stringify({ error: "Invalid slug format." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (RESERVED_SLUGS.has(slug)) {
      return new Response(
        JSON.stringify({ error: "This URL is reserved. Please choose another." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check slug uniqueness (race condition safety — also enforced by unique constraint)
    const { data: existing } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "This URL is already taken." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        slug,
        name: shop_name,
        timezone,
        currency,
        settings: {
          slot_granularity_min: 15,
          onboarding_complete: false,
        },
      })
      .select("id")
      .single();

    if (tenantError) {
      console.error("Failed to create tenant:", tenantError);
      return new Response(
        JSON.stringify({ error: "Failed to create shop. The URL may already be taken." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add owner as admin member
    const { error: memberError } = await supabase
      .from("tenant_members")
      .insert({
        tenant_id: tenant.id,
        user_id,
        role: "admin",
      });

    if (memberError) {
      console.error("Failed to create tenant member:", memberError);
      // Clean up the tenant if member creation fails
      await supabase.from("tenants").delete().eq("id", tenant.id);
      return new Response(
        JSON.stringify({ error: "Failed to set up shop ownership." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create default schedule templates (Mon-Sat 09:00-17:30)
    const defaultSchedule = [];
    for (let day = 0; day <= 5; day++) {
      defaultSchedule.push({
        tenant_id: tenant.id,
        specialist_id: null,
        day_of_week: day,
        start_time: "09:00",
        end_time: "17:30",
        break_start: "13:00",
        break_end: "13:30",
      });
    }

    // Schedule templates require specialist_id, so we skip default templates
    // until the owner adds their first specialist. The onboarding checklist
    // will guide them through this.

    return new Response(
      JSON.stringify({ tenant_id: tenant.id, slug }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("register-tenant error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
