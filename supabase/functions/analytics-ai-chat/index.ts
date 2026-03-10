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
    const { message, analyticsData } = await req.json();

    if (!message) {
      return json({ error: "Mensagem é obrigatória" }, 400);
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Não autorizado" }, 401);
    }

    const supabase = getSupabase(authHeader);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: "Usuário não autenticado" }, 401);
    }

    const restaurantId = user.id;
    const serviceDb = getServiceSupabase();

    // Fetch analytics context from DB
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split("T")[0];

    const [{ data: orders }, { data: products }] = await Promise.all([
      serviceDb
        .from("orders")
        .select("id, status, total_amount, created_at, payment_method")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", startDate),
      serviceDb
        .from("products")
        .select("id, name, price, available")
        .eq("restaurant_id", restaurantId),
    ]);

    const totalOrders = orders?.length || 0;
    const delivered = orders?.filter((o) => o.status === "delivered") || [];
    const cancelled = orders?.filter((o) => o.status === "cancelled") || [];
    const totalRevenue = delivered.reduce((s, o) => s + (o.total_amount || 0), 0);
    const avgTicket = delivered.length > 0 ? totalRevenue / delivered.length : 0;
    const cancellationRate = totalOrders > 0 ? (cancelled.length / totalOrders) * 100 : 0;

    const contextData = {
      totalOrders,
      deliveredOrders: delivered.length,
      cancelledOrders: cancelled.length,
      totalRevenue: totalRevenue.toFixed(2),
      avgTicket: avgTicket.toFixed(2),
      cancellationRate: cancellationRate.toFixed(1),
      totalProducts: products?.length || 0,
      ...(analyticsData || {}),
    };

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return json({ error: "GEMINI_API_KEY não configurada" }, 500);
    }

    const systemPrompt = `Você é um analista de dados especializado em restaurantes e delivery. 
Responda em português brasileiro de forma clara e objetiva.
Use os dados fornecidos para dar insights acionáveis.
Formate com markdown quando apropriado.

Dados do restaurante (últimos 30 dias):
${JSON.stringify(contextData, null, 2)}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: systemPrompt + "\n\nPergunta do usuário: " + message }] },
          ],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
      }
    );

    const geminiData = await geminiRes.json();
    const responseText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Não consegui gerar uma análise no momento. Tente novamente.";

    return json({ response: responseText });
  } catch (err) {
    console.error("Analytics AI error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
