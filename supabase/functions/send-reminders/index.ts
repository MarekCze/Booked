import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    let sent24h = 0;
    let sent1h = 0;

    // --- 24-hour reminders ---
    const window24Start = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const window24End = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: bookings24h } = await supabase
      .from("bookings")
      .select(`
        id, client_phone, client_name, starts_at,
        specialists:specialist_id(name),
        services:service_id(name),
        tenants:tenant_id(name, slug)
      `)
      .eq("status", "confirmed")
      .eq("reminder_sent", false)
      .gte("starts_at", window24Start.toISOString())
      .lte("starts_at", window24End.toISOString());

    for (const booking of bookings24h || []) {
      if (!booking.client_phone) continue;

      const specialistName = (booking.specialists as unknown as { name: string })?.name || "your specialist";
      const serviceName = (booking.services as unknown as { name: string })?.name || "your appointment";
      const shopName = (booking.tenants as unknown as { name: string; slug: string })?.name || "the shop";
      const slug = (booking.tenants as unknown as { name: string; slug: string })?.slug || "";
      const time = new Date(booking.starts_at).toLocaleTimeString("en-IE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const body = `Reminder: ${serviceName} with ${specialistName} tomorrow at ${time} at ${shopName}. Need to change? https://${slug}.clipbook.io/account`;

      // Send SMS via send-sms function
      const { error: smsError } = await supabase.functions.invoke("send-sms", {
        body: { to: booking.client_phone, body },
      });

      if (!smsError) {
        await supabase
          .from("bookings")
          .update({ reminder_sent: true })
          .eq("id", booking.id);
        sent24h++;
      }
    }

    // --- 1-hour reminders ---
    const window1hStart = new Date(now.getTime() + 50 * 60 * 1000);
    const window1hEnd = new Date(now.getTime() + 70 * 60 * 1000);

    const { data: bookings1h } = await supabase
      .from("bookings")
      .select(`
        id, client_phone, client_name, starts_at,
        specialists:specialist_id(name),
        tenants:tenant_id(name)
      `)
      .eq("status", "confirmed")
      .eq("reminder_1h_sent", false)
      .gte("starts_at", window1hStart.toISOString())
      .lte("starts_at", window1hEnd.toISOString());

    for (const booking of bookings1h || []) {
      if (!booking.client_phone) continue;

      const specialistName = (booking.specialists as unknown as { name: string })?.name || "your specialist";
      const shopName = (booking.tenants as unknown as { name: string })?.name || "the shop";

      const body = `Your appointment with ${specialistName} at ${shopName} is in 1 hour. See you soon!`;

      const { error: smsError } = await supabase.functions.invoke("send-sms", {
        body: { to: booking.client_phone, body },
      });

      if (!smsError) {
        await supabase
          .from("bookings")
          .update({ reminder_1h_sent: true })
          .eq("id", booking.id);
        sent1h++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent_24h: sent24h,
        sent_1h: sent1h,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-reminders error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
