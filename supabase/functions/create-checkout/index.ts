import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({
          error: "Stripe is not configured for this tenant.",
          code: "STRIPE_NOT_CONFIGURED",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      slot_ids,
      specialist_id,
      service_id,
      tenant_id,
      client_id,
      client_name,
      client_phone,
      price_cents,
      notes,
    } = await req.json();

    // Look up tenant's Stripe Connect account
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("stripe_account_id, name, slug, currency")
      .eq("id", tenant_id)
      .single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: "Tenant not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tenant.stripe_account_id) {
      return new Response(
        JSON.stringify({
          error: "This shop has not completed Stripe setup.",
          code: "STRIPE_NOT_CONFIGURED",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get service details for the line item description
    const { data: service } = await supabase
      .from("services")
      .select("name, duration_min")
      .eq("id", service_id)
      .single();

    const { data: specialist } = await supabase
      .from("specialists")
      .select("name")
      .eq("id", specialist_id)
      .single();

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const appUrl = Deno.env.get("APP_URL") || `https://${tenant.slug}.clipbook.io`;

    // Create Stripe Checkout Session on the connected account
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: tenant.currency.toLowerCase(),
              product_data: {
                name: service?.name || "Booking",
                description: `with ${specialist?.name || "Specialist"} - ${service?.duration_min || 0} min`,
              },
              unit_amount: price_cents,
            },
            quantity: 1,
          },
        ],
        metadata: {
          slot_ids: JSON.stringify(slot_ids),
          specialist_id,
          service_id,
          tenant_id,
          client_id: client_id || "",
          client_name,
          client_phone,
          price_cents: String(price_cents),
          notes: notes || "",
        },
        success_url: `${appUrl}/book/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/book/cancelled`,
        payment_intent_data: {
          application_fee_amount: Math.round(price_cents * 0.05), // 5% platform fee
        },
      },
      {
        stripeAccount: tenant.stripe_account_id,
      }
    );

    return new Response(
      JSON.stringify({ checkout_url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-checkout error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
