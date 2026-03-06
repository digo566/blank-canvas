import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, analyticsData } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch enriched financial context for AI
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [ordersResult, expensesResult, clientsResult] = await Promise.all([
      supabase
        .from("orders")
        .select("*, order_items(quantity, subtotal, unit_price, product:products(name, cost_price, price))")
        .eq("restaurant_id", user.id)
        .gte("created_at", thirtyDaysAgo),
      supabase
        .from("expenses")
        .select("amount, description")
        .eq("restaurant_id", user.id)
        .gte("expense_date", thirtyDaysAgo),
      supabase
        .from("clients")
        .select("id, name, phone")
        .eq("restaurant_id", user.id),
    ]);

    const orders = ordersResult.data || [];
    const expenses = expensesResult.data || [];
    const clients = clientsResult.data || [];

    // Calculate CMV (Custo de Mercadoria Vendida)
    const delivered = orders.filter((o: any) => o.status === "delivered");
    const cancelled = orders.filter((o: any) => o.status === "cancelled");
    const totalRevenue = delivered.reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
    const totalExpenses = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
    
    let cmv = 0;
    const productPerf: Record<string, { qty: number; revenue: number; cost: number }> = {};
    delivered.forEach((order: any) => {
      order.order_items?.forEach((item: any) => {
        const costPrice = item.product?.cost_price || 0;
        cmv += costPrice * item.quantity;
        const name = item.product?.name || "Desconhecido";
        if (!productPerf[name]) productPerf[name] = { qty: 0, revenue: 0, cost: 0 };
        productPerf[name].qty += item.quantity;
        productPerf[name].revenue += item.subtotal || 0;
        productPerf[name].cost += costPrice * item.quantity;
      });
    });

    const topProducts = Object.entries(productPerf)
      .map(([name, d]) => ({ name, qty: d.qty, revenue: d.revenue, margin: d.revenue > 0 ? ((d.revenue - d.cost) / d.revenue * 100) : 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Churn risk: clients who ordered >2 times but not in last 14 days
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const clientOrderCounts: Record<string, { count: number; lastOrder: string; name: string }> = {};
    orders.forEach((o: any) => {
      if (o.client_id && o.status !== "cancelled") {
        if (!clientOrderCounts[o.client_id]) {
          const client = clients.find((c: any) => c.id === o.client_id);
          clientOrderCounts[o.client_id] = { count: 0, lastOrder: "", name: client?.name || "Desconhecido" };
        }
        clientOrderCounts[o.client_id].count++;
        if (o.created_at > (clientOrderCounts[o.client_id].lastOrder || "")) {
          clientOrderCounts[o.client_id].lastOrder = o.created_at;
        }
      }
    });

    const churnRisk = Object.entries(clientOrderCounts)
      .filter(([_, d]) => d.count >= 2 && d.lastOrder < fourteenDaysAgo)
      .map(([id, d]) => ({ name: d.name, orders: d.count, lastOrder: d.lastOrder }))
      .slice(0, 10);

    const cancellationRate = orders.length > 0 ? (cancelled.length / orders.length * 100) : 0;
    const netProfit = totalRevenue - cmv - totalExpenses;

    const financialContext = {
      totalVendas: totalRevenue,
      cmv,
      despesasOperacionais: totalExpenses,
      lucroLiquido: netProfit,
      margemLiquida: totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0,
      taxaCancelamento: cancellationRate,
      totalPedidos: orders.length,
      pedidosEntregues: delivered.length,
      pedidosCancelados: cancelled.length,
      ticketMedio: delivered.length > 0 ? totalRevenue / delivered.length : 0,
      topProdutos: topProducts,
      clientesRiscoChurn: churnRisk,
      totalClientes: clients.length,
    };

    const systemPrompt = `Você é um especialista em análise de dados e inteligência de negócios para restaurantes e delivery.

CONTEXTO FINANCEIRO REAL DO RESTAURANTE (últimos 30 dias):
${JSON.stringify(financialContext, null, 2)}

DADOS OPERACIONAIS:
${JSON.stringify(analyticsData, null, 2)}

SUAS CAPACIDADES:
1. Análise de tendências de pedidos e vendas com dados financeiros reais
2. Identificação de padrões de cancelamento e abandono
3. Análise de performance e MARGEM de produtos (usando CMV real)
4. Recomendações para aumentar conversão e lucro
5. Identificação de clientes em risco de CHURN (parar de pedir)
6. Análise de CMV (Custo de Mercadoria Vendida) e margem de contribuição
7. Diagnóstico de saúde financeira

REGRAS CRÍTICAS:
1. **JUSTIFIQUE COM DADOS**: Sempre cite números específicos do contexto acima
2. **IMPACTO FINANCEIRO**: Quantifique impacto potencial em R$
3. **CHURN**: Quando perguntado sobre churn, use a lista de clientesRiscoChurn
4. **MARGEM**: Use CMV real para calcular margem, não valores estimados
5. **ESTRUTURA**:
   📊 **Análise dos Dados**: O que os números mostram
   💡 **Insight**: O que isso significa
   🎯 **Ação Recomendada**: O que fazer
   📈 **Impacto Esperado**: Resultado potencial

- Seja direto e prático
- Responda em português brasileiro
- Use formatação markdown com emojis`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione mais créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao processar análise" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Analytics AI chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
