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

      // If pending, check document status with Asaas
      if (profile.asaas_customer_id && profile.asaas_account_status === "aguardando_verificacao") {
        try {
          const account = await asaas(`/accounts/${profile.asaas_customer_id}`);
          if (account?.id) {
            // Check if account documentation is approved
            const docStatus = account.documentStatus;
            if (docStatus === "APPROVED" || account.commercialInfoExpiration) {
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

    // ─── CREATE SUBACCOUNT ──────────────────────────────────
    if (action === "create-account") {
      const { restaurantId, name, cpfCnpj, email, phone, birthDate, companyType, incomeValue } = params;
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

      const cleanCpfCnpj = cpfCnpj.replace(/\D/g, "");
      const isCompany = cleanCpfCnpj.length > 11;

      // Create SUBACCOUNT (not customer) via POST /accounts
      const accountPayload: Record<string, unknown> = {
        name,
        cpfCnpj: cleanCpfCnpj,
        email,
        phone: phone?.replace(/\D/g, ""),
        companyType: companyType || (isCompany ? "LIMITED" : null),
        incomeValue: incomeValue || 5000,
      };

      console.log("Creating Asaas subaccount:", JSON.stringify(accountPayload));

      const account = await asaas("/accounts", "POST", accountPayload);

      if (account.errors) {
        console.error("Asaas account creation error:", JSON.stringify(account.errors));
        return json({ error: account.errors[0]?.description || "Erro ao criar subconta na Asaas" }, 400);
      }

      console.log("Asaas subaccount created:", account.id, "onboardingUrl:", account.accountNumber?.onboardingUrl);

      // The onboardingUrl is where the restaurant completes verification
      const onboardingUrl = account.onboardingUrl || null;

      // Save wallet ID and API key securely
      await serviceDb
        .from("profiles")
        .update({
          asaas_customer_id: account.id,
          asaas_account_status: "aguardando_verificacao",
          asaas_onboarding_url: onboardingUrl,
          asaas_created_at: new Date().toISOString(),
        })
        .eq("id", restaurantId);

      return json({
        status: "aguardando_verificacao",
        customerId: account.id,
        onboardingUrl,
        walletId: account.walletId || null,
      });
    }

    // ─── REFRESH STATUS ─────────────────────────────────────
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

      // Check subaccount status
      const account = await asaas(`/accounts/${profile.asaas_customer_id}`);
      console.log("Asaas account status check:", JSON.stringify(account));

      if (!account?.id) {
        return json({ status: profile.asaas_account_status || "inactive" });
      }

      let newStatus = profile.asaas_account_status;

      // Check document/onboarding status
      if (account.documentStatus === "APPROVED") {
        newStatus = "ativa";
      } else if (account.documentStatus === "PENDING" || account.documentStatus === "AWAITING_APPROVAL") {
        newStatus = "aguardando_verificacao";
      }

      if (newStatus !== profile.asaas_account_status) {
        await serviceDb
          .from("profiles")
          .update({ asaas_account_status: newStatus })
          .eq("id", restaurantId);
      }

      return json({
        status: newStatus,
        documentStatus: account.documentStatus,
        onboardingUrl: account.onboardingUrl,
      });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (err) {
    console.error("Edge function error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
