import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

function getServiceSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { event, payment } = body;

    console.log("Asaas webhook received:", event, payment?.id);

    if (!event || !payment) {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceDb = getServiceSupabase();

    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      const orderId = payment.externalReference;
      if (orderId) {
        // Update order status
        const { error } = await serviceDb
          .from("orders")
          .update({ status: "preparing", payment_method: payment.billingType })
          .eq("id", orderId)
          .eq("status", "pending");

        if (error) {
          console.error("Error updating order:", error);
        } else {
          console.log(`Order ${orderId} marked as paid/preparing`);
        }
      }

      // Also update subscription if it's a subscription payment
      if (payment.subscription) {
        await serviceDb
          .from("subscriptions")
          .update({ status: "active" })
          .eq("asaas_subscription_id", payment.subscription);
      }
    }

    if (event === "PAYMENT_OVERDUE" || event === "PAYMENT_DELETED") {
      const orderId = payment.externalReference;
      if (orderId) {
        console.log(`Payment ${event} for order ${orderId}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
