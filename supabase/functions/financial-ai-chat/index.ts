import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const { message, conversationHistory } = await req.json();

    if (!message) {
      return json({ error: "Mensagem é obrigatória" }, 400);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Usuário não autenticado" }, 401);
    }

    const supabase = getSupabase(authHeader);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: "Usuário não autenticado" }, 401);
    }

    const restaurantId = user.id;
    const serviceDb = getServiceSupabase();

    // Fetch financial context
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split("T")[0];

    const [
      { data: orders },
      { data: expenses },
      { data: payables },
      { data: receivables },
      { data: inventory },
    ] = await Promise.all([
      serviceDb
        .from("orders")
        .select("id, status, total_amount, created_at, order_items(quantity, unit_price, subtotal, product:products(name, cost_price, price))")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", startDate),
      serviceDb
        .from("expenses")
        .select("amount, description, expense_date, category_id")
        .eq("restaurant_id", restaurantId)
        .gte("expense_date", startDate),
      serviceDb
        .from("accounts_payable")
        .select("amount, status, due_date, supplier_name")
        .eq("restaurant_id", restaurantId),
      serviceDb
        .from("accounts_receivable")
        .select("amount, status, due_date, client_name")
        .eq("restaurant_id", restaurantId),
      serviceDb
        .from("inventory")
        .select("ingredient_name, current_quantity, min_quantity, unit")
        .eq("restaurant_id", restaurantId),
    ]);

    const delivered = orders?.filter((o) => o.status === "delivered") || [];
    const totalRevenue = delivered.reduce((s, o) => s + (o.total_amount || 0), 0);
    const totalExpenses = (expenses || []).reduce((s, e) => s + (e.amount || 0), 0);

    let productCosts = 0;
    delivered.forEach((o) => {
      (o.order_items as any[])?.forEach((i) => {
        productCosts += ((i.product as any)?.cost_price || 0) * i.quantity;
      });
    });

    const grossProfit = totalRevenue - productCosts;
    const netProfit = grossProfit - totalExpenses;
    const pendingPayables = (payables || []).filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
    const overduePayables = (payables || []).filter((p) => p.status === "overdue").reduce((s, p) => s + p.amount, 0);
    const pendingReceivables = (receivables || []).filter((r) => r.status !== "received").reduce((s, r) => s + r.amount, 0);
    const lowStock = (inventory || []).filter((i) => i.current_quantity <= i.min_quantity);

    const healthScore = Math.max(0, Math.min(100,
      100
      - (netProfit < 0 ? 30 : netProfit < totalRevenue * 0.1 ? 15 : 0)
      - (overduePayables > 0 ? 20 : 0)
      - (lowStock.length > 0 ? 10 : 0)
    ));

    const contextData = {
      receita: `R$ ${totalRevenue.toFixed(2)}`,
      despesas: `R$ ${totalExpenses.toFixed(2)}`,
      custos_produtos: `R$ ${productCosts.toFixed(2)}`,
      lucro_bruto: `R$ ${grossProfit.toFixed(2)}`,
      lucro_liquido: `R$ ${netProfit.toFixed(2)}`,
      contas_a_pagar_pendentes: `R$ ${pendingPayables.toFixed(2)}`,
      contas_vencidas: `R$ ${overduePayables.toFixed(2)}`,
      contas_a_receber: `R$ ${pendingReceivables.toFixed(2)}`,
      pedidos_entregues: delivered.length,
      ticket_medio: delivered.length > 0 ? `R$ ${(totalRevenue / delivered.length).toFixed(2)}` : "N/A",
      estoque_baixo: lowStock.map((i) => `${i.ingredient_name}: ${i.current_quantity} ${i.unit}`),
      score_saude: healthScore,
    };

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return json({ error: "GEMINI_API_KEY não configurada" }, 500);
    }

    // Build conversation for Gemini
    const systemPrompt = `Você é um consultor financeiro especializado em restaurantes e delivery.
Responda em português brasileiro de forma clara, objetiva e com dados concretos.
Use os dados financeiros fornecidos para dar recomendações práticas.
Formate com markdown quando apropriado. Use emojis para tornar mais visual.

Dados financeiros do restaurante (últimos 30 dias):
${JSON.stringify(contextData, null, 2)}`;

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Add conversation history
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    // Add current message with system context
    const userPrompt = contents.length === 0
      ? systemPrompt + "\n\nPergunta do usuário: " + message
      : message;

    contents.push({ role: "user", parts: [{ text: userPrompt }] });

    // If first message, inject system prompt
    if (contents.length === 1) {
      contents[0].parts[0].text = systemPrompt + "\n\nPergunta do usuário: " + message;
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
        }),
      }
    );

    const geminiData = await geminiRes.json();
    const responseText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Não consegui gerar uma análise financeira no momento. Tente novamente.";

    const alerts: string[] = [];
    if (netProfit < 0) alerts.push("⚠️ Prejuízo detectado no período");
    if (overduePayables > 0) alerts.push("🔴 Contas vencidas pendentes");
    if (lowStock.length > 0) alerts.push(`📦 ${lowStock.length} itens com estoque baixo`);

    return json({
      response: responseText,
      context: { healthScore, alerts },
    });
  } catch (err) {
    console.error("Financial AI error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
