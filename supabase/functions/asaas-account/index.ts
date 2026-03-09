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
    const body = await req.json();
    const { action, ...params } = body;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = getSupabase(authHeader);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = user.id;

    const serviceDb = getServiceSupabase();
    const { data: roles } = await serviceDb
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return json({ error: "Apenas administradores podem acessar esta função" }, 403);
    }

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
      
      // Validate CPF (11 digits) or CNPJ (14 digits)
      if (cleanCpfCnpj.length !== 11 && cleanCpfCnpj.length !== 14) {
        return json({ error: `CPF deve ter 11 dígitos e CNPJ 14 dígitos. Você informou ${cleanCpfCnpj.length} dígitos.` }, 400);
      }

      // Validate CPF check digits
      if (cleanCpfCnpj.length === 11) {
        if (/^(\d)\1{10}$/.test(cleanCpfCnpj)) {
          return json({ error: "CPF inválido." }, 400);
        }
        let sum = 0;
        for (let i = 0; i < 9; i++) sum += parseInt(cleanCpfCnpj[i]) * (10 - i);
        let check = 11 - (sum % 11);
        if (check >= 10) check = 0;
        if (parseInt(cleanCpfCnpj[9]) !== check) {
          return json({ error: "CPF inválido. Verifique os dígitos." }, 400);
        }
        sum = 0;
        for (let i = 0; i < 10; i++) sum += parseInt(cleanCpfCnpj[i]) * (11 - i);
        check = 11 - (sum % 11);
        if (check >= 10) check = 0;
        if (parseInt(cleanCpfCnpj[10]) !== check) {
          return json({ error: "CPF inválido. Verifique os dígitos." }, 400);
        }
      }

      // Validate CNPJ check digits
      if (cleanCpfCnpj.length === 14) {
        if (/^(\d)\1{13}$/.test(cleanCpfCnpj)) {
          return json({ error: "CNPJ inválido." }, 400);
        }
        const w1 = [5,4,3,2,9,8,7,6,5,4,3,2];
        const w2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
        let sum = 0;
        for (let i = 0; i < 12; i++) sum += parseInt(cleanCpfCnpj[i]) * w1[i];
        let check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        if (parseInt(cleanCpfCnpj[12]) !== check) {
          return json({ error: "CNPJ inválido. Verifique os dígitos." }, 400);
        }
        sum = 0;
        for (let i = 0; i < 13; i++) sum += parseInt(cleanCpfCnpj[i]) * w2[i];
        check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        if (parseInt(cleanCpfCnpj[13]) !== check) {
          return json({ error: "CNPJ inválido. Verifique os dígitos." }, 400);
        }
      }
      
      const isCompany = cleanCpfCnpj.length === 14;
      
      const cleanPhone = mobilePhone.replace(/\D/g, "");
      if (cleanPhone.length < 10 || cleanPhone.length > 11) {
        return json({ error: "Telefone inválido. Informe DDD + número (10 ou 11 dígitos)." }, 400);
      }

      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return json({ error: "Email inválido." }, 400);
      }

      // Build payload according to Asaas POST /accounts docs
      const accountPayload: Record<string, unknown> = {
        name: name.trim(),
        cpfCnpj: cleanCpfCnpj,
        email: cleanEmail,
        mobilePhone: cleanPhone,
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

      // If CPF/CNPJ or email already in use, clean up and retry
      if (account.errors) {
        const alreadyInUse = account.errors.some((e: { description?: string }) =>
          e.description?.includes("já está em uso")
        );

        if (alreadyInUse) {
          console.log("Conflict detected, searching for existing subaccounts...");
          
          // Search subaccounts by CPF
          const subByCpf = await asaas(`/accounts?cpfCnpj=${cleanCpfCnpj}`);
          console.log("Subaccount by CPF:", JSON.stringify(subByCpf?.data?.length || 0));
          
          // Search subaccounts by email
          const encodedEmail = encodeURIComponent(accountPayload.email as string);
          const subByEmail = await asaas(`/accounts?email=${encodedEmail}`);
          console.log("Subaccount by email:", JSON.stringify(subByEmail?.data?.length || 0));
          
          // Check if we found an existing subaccount
          const existingSub = subByCpf?.data?.[0] || subByEmail?.data?.[0];
          
          if (existingSub) {
            account = existingSub;
            console.log("Found existing subaccount:", account.id, "walletId:", account.walletId);
          } else {
            // No subaccount found - clean up customers and retry
            console.log("No subaccount found, cleaning customers...");
            
            // Delete ALL customers by CPF
            const custByCpf = await asaas(`/customers?cpfCnpj=${cleanCpfCnpj}`);
            console.log("Customers by CPF:", custByCpf?.data?.length || 0);
            for (const cust of (custByCpf?.data || [])) {
              console.log("Deleting customer:", cust.id, cust.email);
              await asaas(`/customers/${cust.id}`, "DELETE");
            }

            // Delete ALL customers by email
            const custByEmail = await asaas(`/customers?email=${encodedEmail}`);
            console.log("Customers by email:", custByEmail?.data?.length || 0);
            for (const cust of (custByEmail?.data || [])) {
              console.log("Deleting customer:", cust.id, cust.email);
              await asaas(`/customers/${cust.id}`, "DELETE");
            }

            // Wait longer for Asaas to process deletions
            await new Promise((r) => setTimeout(r, 5000));
            
            // Retry
            console.log("Retrying subaccount creation...");
            account = await asaas("/accounts", "POST", accountPayload);
            
            if (account.errors) {
              console.error("Retry 1 failed:", JSON.stringify(account.errors));
              
              // Last resort: wait more and try once more
              await new Promise((r) => setTimeout(r, 5000));
              account = await asaas("/accounts", "POST", accountPayload);
              
              if (account.errors) {
                console.error("Retry 2 failed:", JSON.stringify(account.errors));
                
                // Final check: maybe the subaccount was actually created by a previous attempt
                const finalCheck = await asaas(`/accounts?cpfCnpj=${cleanCpfCnpj}`);
                const finalCheckEmail = await asaas(`/accounts?email=${encodedEmail}`);
                const found = finalCheck?.data?.[0] || finalCheckEmail?.data?.[0];
                
                if (found) {
                  console.log("Found subaccount on final check:", found.id);
                  account = found;
                } else {
                  return json({ 
                    error: "CPF/email já cadastrado no sistema de pagamentos. Aguarde alguns minutos e tente novamente, ou entre em contato com o suporte." 
                  }, 400);
                }
              }
            }
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

      const onboardingUrl = account.onboardingUrl || account.accountNumber?.walletUrl || null;

      // Update profile with any new info
      const updateData: Record<string, unknown> = {};
      if (newStatus !== profile.asaas_account_status) {
        updateData.asaas_account_status = newStatus;
      }
      if (onboardingUrl) {
        updateData.asaas_onboarding_url = onboardingUrl;
      }
      if (Object.keys(updateData).length > 0) {
        await serviceDb
          .from("profiles")
          .update(updateData)
          .eq("id", restaurantId);
      }

      return json({
        status: newStatus,
        documentStatus: account.documentStatus,
        onboardingUrl: onboardingUrl,
        loginUrl: `https://www.asaas.com/login`,
      });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (err) {
    console.error("Edge function error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
