import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;
const ASAAS_BASE = "https://api.asaas.com/v3";

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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = getSupabase(authHeader);
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    // Check admin role
    const serviceDb = getServiceSupabase();
    const { data: roles } = await serviceDb
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return json({ error: "Apenas administradores podem acessar esta função" }, 403);
    }

    const { action, ...params } = await req.json();

    // ─── GET ACCOUNT STATUS ─────────────────────────────────
    if (action === "get-status") {
      const { restaurantId } = params;
      if (!restaurantId) return json({ error: "restaurantId required" }, 400);

      const { data: profile } = await serviceDb
        .from("profiles")
        .select("asaas_customer_id, asaas_account_status, asaas_onboarding_url, asaas_created_at")
        .eq("id", restaurantId)
        .single();

      if (!profile) return json({ error: "Restaurante não encontrado" }, 404);

      // If has customer ID and status is pending, check with Asaas
      if (profile.asaas_customer_id && profile.asaas_account_status === "aguardando_verificacao") {
        try {
          const customer = await asaas(`/customers/${profile.asaas_customer_id}`);
          if (customer?.id) {
            // Check if account has bank info or pix configured
            const bankAccounts = await asaas(`/bankAccounts?customer=${profile.asaas_customer_id}`);
            const hasBankInfo = bankAccounts?.data?.length > 0;

            if (hasBankInfo) {
              await serviceDb
                .from("profiles")
                .update({ asaas_account_status: "ativa" })
                .eq("id", restaurantId);
              profile.asaas_account_status = "ativa";
            }
          }
        } catch (_e) {
          console.error("Error checking Asaas account:", _e);
        }
      }

      return json({
        status: profile.asaas_account_status || "inactive",
        customerId: profile.asaas_customer_id,
        onboardingUrl: profile.asaas_onboarding_url,
        createdAt: profile.asaas_created_at,
      });
    }

    // ─── CREATE ACCOUNT ─────────────────────────────────────
    if (action === "create-account") {
      const { restaurantId, name, cpfCnpj, email, phone } = params;
      if (!restaurantId || !name || !cpfCnpj || !email) {
        return json({ error: "Campos obrigatórios: restaurantId, name, cpfCnpj, email" }, 400);
      }

      // Check if already has account
      const { data: existing } = await serviceDb
        .from("profiles")
        .select("asaas_customer_id")
        .eq("id", restaurantId)
        .single();

      if (existing?.asaas_customer_id) {
        return json({ error: "Restaurante já possui conta financeira" }, 400);
      }

      // Create customer in Asaas
      const customer = await asaas("/customers", "POST", {
        name,
        cpfCnpj: cpfCnpj.replace(/\D/g, ""),
        email,
        phone: phone?.replace(/\D/g, ""),
      });

      if (customer.errors) {
        return json({ error: customer.errors[0]?.description || "Erro ao criar conta na Asaas" }, 400);
      }

      // Build onboarding URL
      const onboardingUrl = `https://www.asaas.com/customerOnboarding/${customer.id}`;

      // Update profile
      await serviceDb
        .from("profiles")
        .update({
          asaas_customer_id: customer.id,
          asaas_account_status: "aguardando_verificacao",
          asaas_onboarding_url: onboardingUrl,
          asaas_created_at: new Date().toISOString(),
        })
        .eq("id", restaurantId);

      return json({
        status: "aguardando_verificacao",
        customerId: customer.id,
        onboardingUrl,
      });
    }

    // ─── CREATE CHARGE ──────────────────────────────────────
    if (action === "create-charge") {
      const { restaurantId, orderId, value, description, billingType } = params;
      if (!restaurantId || !orderId || !value || !billingType) {
        return json({ error: "Campos obrigatórios: restaurantId, orderId, value, billingType" }, 400);
      }

      // Get restaurant's Asaas customer ID
      const { data: profile } = await serviceDb
        .from("profiles")
        .select("asaas_customer_id, asaas_account_status")
        .eq("id", restaurantId)
        .single();

      if (!profile?.asaas_customer_id || profile.asaas_account_status !== "ativa") {
        return json({ error: "Restaurante não possui conta de recebimentos ativa" }, 400);
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1);

      const payment = await asaas("/payments", "POST", {
        customer: profile.asaas_customer_id,
        billingType,
        value,
        dueDate: dueDate.toISOString().split("T")[0],
        description: description || `Pedido #${orderId}`,
        externalReference: orderId,
      });

      if (payment.errors) {
        return json({ error: payment.errors[0]?.description || "Erro ao criar cobrança" }, 400);
      }

      let paymentInfo = null;
      if (billingType === "PIX") {
        await new Promise((r) => setTimeout(r, 1500));
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
          type: billingType,
          paymentId: payment.id,
          bankSlipUrl: payment.bankSlipUrl,
          invoiceUrl: payment.invoiceUrl,
          value: payment.value,
          dueDate: payment.dueDate,
        };
      }

      return json({ paymentInfo });
    }

    // ─── CHECK ACCOUNT STATUS (REFRESH) ─────────────────────
    if (action === "refresh-status") {
      const { restaurantId } = params;
      if (!restaurantId) return json({ error: "restaurantId required" }, 400);

      const { data: profile } = await serviceDb
        .from("profiles")
        .select("asaas_customer_id, asaas_account_status")
        .eq("id", restaurantId)
        .single();

      if (!profile?.asaas_customer_id) {
        return json({ status: "inactive" });
      }

      const customer = await asaas(`/customers/${profile.asaas_customer_id}`);
      if (!customer?.id) {
        return json({ status: profile.asaas_account_status || "inactive" });
      }

      // Check transfers/subaccounts status
      let newStatus = profile.asaas_account_status;
      if (customer.canReceive === true || customer.commercialInfoExpiration) {
        newStatus = "ativa";
      }

      if (newStatus !== profile.asaas_account_status) {
        await serviceDb
          .from("profiles")
          .update({ asaas_account_status: newStatus })
          .eq("id", restaurantId);
      }

      return json({ status: newStatus, customer });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (err) {
    console.error("Edge function error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
