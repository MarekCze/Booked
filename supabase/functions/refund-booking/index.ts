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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: "Stripe is not configured." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { booking_id } = await req.json();
    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: "booking_id is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, tenant_id, client_id, payment_status, stripe_payment_intent_id, price_cents")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is the booking owner or a tenant admin
    const isOwner = booking.client_id === user.id;
    const { data: member } = await supabase
      .from("tenant_members")
      .select("role")
      .eq("tenant_id", booking.tenant_id)
      .eq("user_id", user.id)
      .single();

    if (!isOwner && !member) {
      return new Response(
        JSON.stringify({ error: "Not authorized to refund this booking." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (booking.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ error: "Booking is not in paid status." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!booking.stripe_payment_intent_id) {
      return new Response(
        JSON.stringify({ error: "No payment intent associated with this booking." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tenant's Stripe Connect account
    const { data: tenant } = await supabase
      .from("tenants")
      .select("stripe_account_id")
      .eq("id", booking.tenant_id)
      .single();

    // Create Stripe refund
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: booking.stripe_payment_intent_id,
    };

    const refund = await stripe.refunds.create(
      refundParams,
      tenant?.stripe_account_id
        ? { stripeAccount: tenant.stripe_account_id }
        : undefined
    );

    // Update booking payment status
    await supabase
      .from("bookings")
      .update({ payment_status: "refunded" })
      .eq("id", booking_id);

    return new Response(
      JSON.stringify({ refund_id: refund.id, status: "refunded" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("refund-booking error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
