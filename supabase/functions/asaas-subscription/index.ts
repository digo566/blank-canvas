import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;
const ASAAS_BASE = "https://api.asaas.com/v3";
const SUBSCRIPTION_VALUE = 250;

async function asaas(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_API_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

function getSupabase(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabase(authHeader);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { action, ...params } = await req.json();

    // ─── CHECK STATUS ───────────────────────────────────────
    if (action === "check-status") {
      const serviceDb = getServiceSupabase();
      const { data: sub } = await serviceDb
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sub) {
        return json({ status: "none", subscription: null });
      }

      // If has asaas_subscription_id, check real status
      if (sub.asaas_subscription_id) {
        try {
          const asaasSub = await asaas(`/subscriptions/${sub.asaas_subscription_id}`);
          if (asaasSub?.id) {
            const newStatus = asaasSub.status === "ACTIVE" ? "active" : "inactive";
            if (newStatus !== sub.status) {
              await serviceDb
                .from("subscriptions")
                .update({ status: newStatus, next_due_date: asaasSub.nextDueDate })
                .eq("id", sub.id);
              sub.status = newStatus;
              sub.next_due_date = asaasSub.nextDueDate;
            }
          }
        } catch (_e) {
          console.error("Error checking Asaas subscription:", _e);
        }
      }

      return json({
        status: sub.status === "active" ? "active" : "inactive",
        subscription: sub,
      });
    }

    // ─── CREATE SUBSCRIPTION ────────────────────────────────
    if (action === "create-subscription") {
      const { name, cpfCnpj, email, phone, billingType, creditCard, postalCode, addressNumber } = params;

      // 1. Find or create Asaas customer
      const existingCustomers = await asaas(`/customers?email=${encodeURIComponent(email)}`);
      let customerId: string;

      if (existingCustomers?.data?.length > 0) {
        customerId = existingCustomers.data[0].id;
      } else {
        const newCustomer = await asaas("/customers", "POST", {
          name,
          cpfCnpj: cpfCnpj.replace(/\D/g, ""),
          email,
          phone: phone?.replace(/\D/g, ""),
        });
        if (newCustomer.errors) {
          return json({ error: newCustomer.errors[0]?.description || "Erro ao criar cliente no Asaas" }, 400);
        }
        customerId = newCustomer.id;
      }

      // 2. Create subscription in Asaas
      const nextDueDate = new Date();
      nextDueDate.setDate(nextDueDate.getDate() + 1);
      const dueDateStr = nextDueDate.toISOString().split("T")[0];

      const subPayload: Record<string, unknown> = {
        customer: customerId,
        billingType,
        value: SUBSCRIPTION_VALUE,
        nextDueDate: dueDateStr,
        cycle: "MONTHLY",
        description: "Assinatura Grape - Plano Mensal",
      };

      if (billingType === "CREDIT_CARD" && creditCard) {
        subPayload.creditCard = creditCard;
        subPayload.creditCardHolderInfo = {
          name,
          email,
          cpfCnpj: cpfCnpj.replace(/\D/g, ""),
          postalCode: postalCode?.replace(/\D/g, ""),
          addressNumber,
          phone: phone?.replace(/\D/g, ""),
        };
      }

      const asaasSub = await asaas("/subscriptions", "POST", subPayload);
      if (asaasSub.errors) {
        return json({ error: asaasSub.errors[0]?.description || "Erro ao criar assinatura" }, 400);
      }

      // 3. Save in our DB
      const serviceDb = getServiceSupabase();
      const subStatus = asaasSub.status === "ACTIVE" ? "active" : "pending";

      // Delete old subscriptions for this user
      await serviceDb.from("subscriptions").delete().eq("user_id", userId);

      await serviceDb.from("subscriptions").insert({
        user_id: userId,
        asaas_customer_id: customerId,
        asaas_subscription_id: asaasSub.id,
        status: subStatus,
        value: SUBSCRIPTION_VALUE,
        billing_type: billingType,
        cycle: "MONTHLY",
        next_due_date: asaasSub.nextDueDate,
      });

      // 4. Get payment info for PIX/BOLETO
      let paymentInfo = null;
      if (billingType !== "CREDIT_CARD") {
        // Get pending payments for this subscription
        await new Promise((r) => setTimeout(r, 2000));
        const payments = await asaas(`/payments?subscription=${asaasSub.id}&status=PENDING`);
        if (payments?.data?.length > 0) {
          const payment = payments.data[0];
          if (billingType === "PIX") {
            const pixData = await asaas(`/payments/${payment.id}/pixQrCode`);
            paymentInfo = {
              type: "PIX",
              paymentId: payment.id,
              qrCode: pixData?.encodedImage || null,
              copyPaste: pixData?.payload || null,
              value: payment.value,
              dueDate: payment.dueDate,
            };
          } else {
            paymentInfo = {
              type: "BOLETO",
              paymentId: payment.id,
              bankSlipUrl: payment.bankSlipUrl,
              value: payment.value,
              dueDate: payment.dueDate,
            };
          }
        }
      }

      return json({
        status: subStatus,
        subscriptionId: asaasSub.id,
        paymentInfo,
      });
    }

    // ─── CHECK PAYMENT ──────────────────────────────────────
    if (action === "check-payment") {
      const { paymentId } = params;
      if (!paymentId) return json({ error: "paymentId required" }, 400);

      const payment = await asaas(`/payments/${paymentId}`);
      const confirmed = payment?.status === "CONFIRMED" || payment?.status === "RECEIVED";

      if (confirmed) {
        const serviceDb = getServiceSupabase();
        await serviceDb
          .from("subscriptions")
          .update({ status: "active" })
          .eq("user_id", userId);
      }

      return json({ confirmed, status: payment?.status });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
