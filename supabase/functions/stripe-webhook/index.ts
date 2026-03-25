import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

serve(async (req) => {
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};

        const slotIds = JSON.parse(metadata.slot_ids || "[]");
        const specialistId = metadata.specialist_id;
        const serviceId = metadata.service_id;
        const tenantId = metadata.tenant_id;
        const clientId = metadata.client_id || null;
        const clientName = metadata.client_name;
        const clientPhone = metadata.client_phone;
        const priceCents = parseInt(metadata.price_cents, 10);
        const paymentIntent =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id || null;

        // Confirm the booking using the RPC function
        const { data: bookingId, error: bookingError } = await supabase.rpc(
          "confirm_booking",
          {
            p_slot_ids: slotIds,
            p_specialist_id: specialistId,
            p_service_id: serviceId,
            p_tenant_id: tenantId,
            p_client_id: clientId || null,
            p_client_name: clientName,
            p_client_phone: clientPhone,
            p_price_cents: priceCents,
            p_payment_intent: paymentIntent,
          }
        );

        if (bookingError) {
          console.error("Failed to confirm booking:", bookingError);
          return new Response(
            JSON.stringify({ error: "Failed to confirm booking" }),
            { status: 500 }
          );
        }

        console.log(`Booking confirmed: ${bookingId}`);

        // Send booking confirmation SMS (fire and forget)
        if (clientPhone) {
          const { data: tenant } = await supabase
            .from("tenants")
            .select("name, slug")
            .eq("id", tenantId)
            .single();

          const { data: specialist } = await supabase
            .from("specialists")
            .select("name")
            .eq("id", specialistId)
            .single();

          const { data: service } = await supabase
            .from("services")
            .select("name")
            .eq("id", serviceId)
            .single();

          if (tenant && specialist && service) {
            // Get booking time from the first slot
            const { data: firstSlot } = await supabase
              .from("slots")
              .select("starts_at")
              .eq("booking_id", bookingId)
              .order("starts_at")
              .limit(1)
              .single();

            const bookingTime = firstSlot
              ? new Date(firstSlot.starts_at).toLocaleString("en-IE", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })
              : "your appointment";

            const smsBody = `Booking confirmed: ${service.name} with ${specialist.name} at ${tenant.name} on ${bookingTime}. To manage: https://${tenant.slug}.clipbook.io/account`;

            supabase.functions
              .invoke("send-sms", {
                body: { to: clientPhone, body: smsBody },
              })
              .catch((err: Error) => console.error("SMS send failed:", err));
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const metadata = paymentIntent.metadata || {};
        const slotIds = JSON.parse(metadata.slot_ids || "[]");

        if (slotIds.length > 0) {
          // Release the held slots
          const { error } = await supabase
            .from("slots")
            .update({ status: "available", held_until: null })
            .in("id", slotIds)
            .eq("status", "held");

          if (error) {
            console.error("Failed to release slots:", error);
          } else {
            console.log(`Released ${slotIds.length} slots after payment failure`);
          }
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        // Update tenant's Stripe onboarding status
        const { error } = await supabase
          .from("tenants")
          .update({
            settings: supabase.rpc ? undefined : undefined, // We'll update via raw query
          })
          .eq("stripe_account_id", account.id);

        if (error) {
          console.error("Failed to update tenant account status:", error);
        }

        // Log the account status for monitoring
        console.log(
          `Stripe account ${account.id} updated: charges_enabled=${account.charges_enabled}, payouts_enabled=${account.payouts_enabled}`
        );
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error processing ${event.type}:`, err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
