import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API_URL = "https://api.asaas.com/v3";

// SECURITY: Price and plan are hardcoded server-side. 
// Client CANNOT override these values.
const PLAN_VALUE = 198.00; // R$198.00/mês
const PLAN_CYCLE = "MONTHLY";
const PLAN_DESCRIPTION = "Assinatura Grape - Plano Profissional";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    if (!ASAAS_API_KEY) {
      throw new Error("ASAAS_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autenticação necessária" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    const asaasHeaders = {
      "Content-Type": "application/json",
      "access_token": ASAAS_API_KEY,
    };

    // ========== CHECK SUBSCRIPTION STATUS ==========
    if (action === "check-status") {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!subscription) {
        return new Response(
          JSON.stringify({ status: "none", subscription: null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // SECURITY: Always verify with Asaas API, never trust local status alone
      if (subscription.asaas_subscription_id) {
        try {
          const paymentsRes = await fetch(
            `${ASAAS_API_URL}/subscriptions/${subscription.asaas_subscription_id}/payments?limit=1&sort=dueDate&order=desc`,
            { headers: asaasHeaders }
          );
          const paymentsData = await paymentsRes.json();

          if (paymentsData.data && paymentsData.data.length > 0) {
            const latestPayment = paymentsData.data[0];
            const paymentStatus = latestPayment.status;

            // SECURITY: Status is determined ONLY by Asaas payment status
            let newStatus = "pending_payment";
            if (["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(paymentStatus)) {
              newStatus = "active";
            } else if (paymentStatus === "OVERDUE") {
              newStatus = "overdue";
            } else if (paymentStatus === "PENDING") {
              newStatus = "pending_payment";
            } else if (["REFUNDED", "REFUND_REQUESTED"].includes(paymentStatus)) {
              newStatus = "cancelled";
            }

            if (newStatus !== subscription.status) {
              await supabase
                .from("subscriptions")
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq("id", subscription.id);
            }

            return new Response(
              JSON.stringify({
                status: newStatus,
                subscription: { ...subscription, status: newStatus },
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch (e) {
          console.error("Error checking Asaas payment status:", e);
        }
      }

      return new Response(
        JSON.stringify({ status: subscription.status, subscription }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== CREATE SUBSCRIPTION ==========
    if (action === "create-subscription") {
      const { name, cpfCnpj, email, phone, billingType } = body;

      // Validate inputs
      if (!name || !cpfCnpj || !email || !billingType) {
        return new Response(
          JSON.stringify({ error: "Dados obrigatórios: nome, CPF/CNPJ, email e forma de pagamento" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Sanitize inputs
      const sanitizedName = String(name).trim().substring(0, 200);
      const sanitizedEmail = String(email).trim().substring(0, 255);
      const cleanCpfCnpj = String(cpfCnpj).replace(/\D/g, "");
      
      if (cleanCpfCnpj.length !== 11 && cleanCpfCnpj.length !== 14) {
        return new Response(
          JSON.stringify({ error: "CPF/CNPJ inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // SECURITY: Only allow valid billing types
      const validBillingTypes = ["PIX", "CREDIT_CARD", "BOLETO"];
      if (!validBillingTypes.includes(billingType)) {
        return new Response(
          JSON.stringify({ error: "Forma de pagamento inválida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if user already has an active subscription
      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingSub?.status === "active") {
        return new Response(
          JSON.stringify({ error: "Você já possui uma assinatura ativa" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let asaasCustomerId = existingSub?.asaas_customer_id;

      // Step 1: Create or get Asaas customer
      if (!asaasCustomerId) {
        const customerRes = await fetch(`${ASAAS_API_URL}/customers`, {
          method: "POST",
          headers: asaasHeaders,
          body: JSON.stringify({
            name: sanitizedName,
            cpfCnpj: cleanCpfCnpj,
            email: sanitizedEmail,
            mobilePhone: phone?.replace(/\D/g, "").substring(0, 15) || undefined,
            externalReference: user.id,
          }),
        });

        const customerData = await customerRes.json();
        if (!customerRes.ok) {
          console.error("Asaas customer creation failed:", customerData);
          return new Response(
            JSON.stringify({ error: customerData.errors?.[0]?.description || "Erro ao criar cliente no Asaas" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        asaasCustomerId = customerData.id;
      }

      // Step 2: Create subscription
      // SECURITY: value, cycle, description are ALL server-side constants
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextDueDate = tomorrow.toISOString().split("T")[0];

      const subscriptionPayload: Record<string, unknown> = {
        customer: asaasCustomerId,
        billingType,
        value: PLAN_VALUE,
        nextDueDate,
        cycle: PLAN_CYCLE,
        description: PLAN_DESCRIPTION,
      };

      // For credit card, add card info (sanitized)
      if (billingType === "CREDIT_CARD" && body.creditCard) {
        subscriptionPayload.creditCard = {
          holderName: String(body.creditCard.holderName || "").trim().substring(0, 100),
          number: String(body.creditCard.number || "").replace(/\D/g, "").substring(0, 19),
          expiryMonth: String(body.creditCard.expiryMonth || "").substring(0, 2),
          expiryYear: String(body.creditCard.expiryYear || "").substring(0, 4),
          ccv: String(body.creditCard.ccv || "").substring(0, 4),
        };
        subscriptionPayload.creditCardHolderInfo = {
          name: sanitizedName,
          email: sanitizedEmail,
          cpfCnpj: cleanCpfCnpj,
          phone: phone?.replace(/\D/g, "").substring(0, 15) || undefined,
          postalCode: body.postalCode ? String(body.postalCode).replace(/\D/g, "").substring(0, 8) : undefined,
          addressNumber: body.addressNumber ? String(body.addressNumber).substring(0, 10) : undefined,
        };
      }

      const subRes = await fetch(`${ASAAS_API_URL}/subscriptions`, {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify(subscriptionPayload),
      });

      const subData = await subRes.json();
      if (!subRes.ok) {
        console.error("Asaas subscription creation failed:", subData);
        return new Response(
          JSON.stringify({ error: subData.errors?.[0]?.description || "Erro ao criar assinatura" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Step 3: For credit card, verify the first payment actually went through
      let initialStatus = "pending_payment";
      let paymentInfo = null;

      try {
        // Wait a moment for Asaas to process the payment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const paymentsRes = await fetch(
          `${ASAAS_API_URL}/subscriptions/${subData.id}/payments?limit=1`,
          { headers: asaasHeaders }
        );
        const paymentsData = await paymentsRes.json();

        if (paymentsData.data && paymentsData.data.length > 0) {
          const payment = paymentsData.data[0];
          const paymentId = payment.id;
          console.log("First payment found:", paymentId, "status:", payment.status, "billingType:", billingType);

          if (billingType === "CREDIT_CARD") {
            // SECURITY: Only set active if Asaas confirms payment
            if (["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(payment.status)) {
              initialStatus = "active";
            } else {
              initialStatus = "pending_payment";
            }
            paymentInfo = {
              type: "CREDIT_CARD",
              status: payment.status,
            };
          } else if (billingType === "PIX") {
            try {
              const pixRes = await fetch(
                `${ASAAS_API_URL}/payments/${paymentId}/pixQrCode`,
                { headers: asaasHeaders }
              );
              const pixData = await pixRes.json();
              console.log("Pix QR Code response status:", pixRes.status, "data:", JSON.stringify(pixData));
              if (!pixRes.ok) {
                console.error("Pix QR Code error:", pixData);
              }
              paymentInfo = {
                type: "PIX",
                qrCode: pixData.encodedImage || null,
                copyPaste: pixData.payload || null,
                expirationDate: pixData.expirationDate || null,
              };
            } catch (pixErr) {
              console.error("Error fetching Pix QR code:", pixErr);
              paymentInfo = { type: "PIX", qrCode: null, copyPaste: null, expirationDate: null };
            }
          } else if (billingType === "BOLETO") {
            const boletoRes = await fetch(
              `${ASAAS_API_URL}/payments/${paymentId}/identificationField`,
              { headers: asaasHeaders }
            );
            const boletoData = await boletoRes.json();
            paymentInfo = {
              type: "BOLETO",
              identificationField: boletoData.identificationField,
              bankSlipUrl: payment.bankSlipUrl,
            };
          }
        }
      } catch (e) {
        console.error("Error getting payment info:", e);
      }

      // Step 4: Save subscription locally (via service_role - bypasses RLS)
      const subscriptionData = {
        user_id: user.id,
        asaas_customer_id: asaasCustomerId,
        asaas_subscription_id: subData.id,
        status: initialStatus,
        billing_type: billingType,
        value: PLAN_VALUE,
        cycle: PLAN_CYCLE,
        next_due_date: nextDueDate,
      };

      if (existingSub) {
        await supabase
          .from("subscriptions")
          .update(subscriptionData)
          .eq("id", existingSub.id);
      } else {
        await supabase
          .from("subscriptions")
          .insert(subscriptionData);
      }

      return new Response(
        JSON.stringify({
          success: true,
          subscriptionId: subData.id,
          status: initialStatus,
          paymentInfo,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Subscription error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar assinatura" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
