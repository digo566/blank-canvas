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
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("Asaas non-JSON response:", text);
    return { errors: [{ description: `HTTP ${res.status}: ${text.substring(0, 200)}` }] };
  }
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

      return json({
        status: profile.asaas_account_status || "inactive",
        customerId: profile.asaas_customer_id,
        onboardingUrl: profile.asaas_onboarding_url,
        createdAt: profile.asaas_created_at,
      });
    }

    // ─── CREATE SUBACCOUNT ──────────────────────────────────
    if (action === "create-account") {
      const { restaurantId, name, cpfCnpj, email, mobilePhone, birthDate, companyType, postalCode, incomeValue } = params;
      if (!restaurantId || !name || !cpfCnpj || !email || !mobilePhone) {
        return json({ error: "Campos obrigatórios: name, cpfCnpj, email, mobilePhone" }, 400);
      }

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

      // Build payload according to Asaas POST /accounts docs
      const accountPayload: Record<string, unknown> = {
        name,
        cpfCnpj: cleanCpfCnpj,
        email,
        mobilePhone: mobilePhone.replace(/\D/g, ""),
        incomeValue: Number(incomeValue) || 5000,
      };

      // CPF requires birthDate
      if (!isCompany && birthDate) {
        accountPayload.birthDate = birthDate;
      }

      // CNPJ requires companyType
      if (isCompany && companyType) {
        accountPayload.companyType = companyType;
      }

      // CEP
      if (postalCode) {
        accountPayload.postalCode = postalCode.replace(/\D/g, "");
      }

      console.log("Creating Asaas subaccount:", JSON.stringify(accountPayload));

      let account = await asaas("/accounts", "POST", accountPayload);

      // If CPF/CNPJ already in use, try to find existing subaccount
      if (account.errors) {
        const cpfInUse = account.errors.some((e: { description?: string }) =>
          e.description?.includes("já está em uso")
        );

        if (cpfInUse) {
          console.log("CPF/CNPJ already in use, searching existing subaccount...");
          const existing = await asaas(`/accounts?cpfCnpj=${cleanCpfCnpj}`);
          if (existing?.data?.length > 0) {
            account = existing.data[0];
            console.log("Found existing subaccount:", account.id);
          } else {
            console.error("Asaas error:", JSON.stringify(account.errors));
            return json({ error: account.errors[0]?.description || "Erro ao criar subconta" }, 400);
          }
        } else {
          console.error("Asaas error:", JSON.stringify(account.errors));
          return json({ error: account.errors[0]?.description || "Erro ao criar subconta" }, 400);
        }
      }

      console.log("Asaas subaccount created successfully:", JSON.stringify({
        id: account.id,
        walletId: account.walletId,
        onboardingUrl: account.onboardingUrl,
        apiKey: account.apiKey ? "***saved***" : "none",
      }));

      // Save the account info - IMPORTANT: save apiKey and walletId
      await serviceDb
        .from("profiles")
        .update({
          asaas_customer_id: account.id,
          asaas_account_status: "aguardando_verificacao",
          asaas_onboarding_url: account.onboardingUrl || null,
          asaas_created_at: new Date().toISOString(),
        })
        .eq("id", restaurantId);

      return json({
        status: "aguardando_verificacao",
        customerId: account.id,
        onboardingUrl: account.onboardingUrl || null,
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

      const account = await asaas(`/accounts/${profile.asaas_customer_id}`);
      console.log("Account status check:", JSON.stringify(account));

      if (!account?.id) {
        return json({ status: profile.asaas_account_status || "inactive" });
      }

      let newStatus = profile.asaas_account_status;
      if (account.documentStatus === "APPROVED") {
        newStatus = "ativa";
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
