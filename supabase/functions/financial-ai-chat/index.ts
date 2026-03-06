import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface FinancialContext {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  cashFlow: number;
  pendingPayables: number;
  overduePayables: number;
  pendingReceivables: number;
  inventoryAlerts: Array<{ name: string; current: number; min: number }>;
  topProducts: Array<{ name: string; revenue: number; margin: number }>;
  lowProducts: Array<{ name: string; revenue: number; margin: number }>;
  recentOrders: number;
  avgTicket: number;
  cancellationRate: number;
}

async function getFinancialContext(supabase: any, restaurantId: string): Promise<FinancialContext> {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  // Get orders from last 30 days
  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*, product:products(name, cost_price, price))')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', thirtyDaysAgoStr);

  // Get expenses from last 30 days
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .gte('expense_date', thirtyDaysAgoStr);

  // Get pending/overdue payables
  const { data: payables } = await supabase
    .from('accounts_payable')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .neq('status', 'paid');

  // Get pending receivables
  const { data: receivables } = await supabase
    .from('accounts_receivable')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .neq('status', 'received');

  // Get inventory alerts
  const { data: inventory } = await supabase
    .from('inventory')
    .select('*')
    .eq('restaurant_id', restaurantId);

  // Get products for analysis
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('restaurant_id', restaurantId);

  // Calculate metrics
  const completedOrders = orders?.filter((o: any) => o.status === 'delivered') || [];
  const cancelledOrders = orders?.filter((o: any) => o.status === 'cancelled') || [];
  
  const totalRevenue = completedOrders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
  const totalExpenses = expenses?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
  const grossProfit = totalRevenue - totalExpenses;
  
  // Calculate product-level costs
  let productCosts = 0;
  completedOrders.forEach((order: any) => {
    order.order_items?.forEach((item: any) => {
      productCosts += (item.product?.cost_price || 0) * item.quantity;
    });
  });
  const netProfit = totalRevenue - productCosts - totalExpenses;

  const pendingPayables = payables?.filter((p: any) => p.status === 'pending')
    .reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
  const overduePayables = payables?.filter((p: any) => p.status === 'overdue')
    .reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
  const pendingReceivables = receivables?.reduce((sum: number, r: any) => sum + r.amount, 0) || 0;

  const inventoryAlerts = inventory?.filter((i: any) => i.current_quantity <= i.min_quantity)
    .map((i: any) => ({
      name: i.ingredient_name || 'Sem nome',
      current: i.current_quantity,
      min: i.min_quantity
    })) || [];

  // Product performance analysis
  const productPerformance: Record<string, { revenue: number; cost: number; quantity: number }> = {};
  completedOrders.forEach((order: any) => {
    order.order_items?.forEach((item: any) => {
      const name = item.product?.name || 'Desconhecido';
      if (!productPerformance[name]) {
        productPerformance[name] = { revenue: 0, cost: 0, quantity: 0 };
      }
      productPerformance[name].revenue += item.subtotal || 0;
      productPerformance[name].cost += (item.product?.cost_price || 0) * item.quantity;
      productPerformance[name].quantity += item.quantity;
    });
  });

  const productList = Object.entries(productPerformance)
    .map(([name, data]) => ({
      name,
      revenue: data.revenue,
      margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const topProducts = productList.slice(0, 5);
  const lowProducts = productList.slice(-5).reverse();

  const avgTicket = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
  const cancellationRate = orders?.length > 0 
    ? (cancelledOrders.length / orders.length) * 100 
    : 0;

  return {
    totalRevenue,
    totalExpenses,
    grossProfit,
    netProfit,
    cashFlow: grossProfit - pendingPayables + pendingReceivables,
    pendingPayables,
    overduePayables,
    pendingReceivables,
    inventoryAlerts,
    topProducts,
    lowProducts,
    recentOrders: completedOrders.length,
    avgTicket,
    cancellationRate
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Autenticação necessária');
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    const { message, conversationHistory = [] } = await req.json();

    if (!message) {
      throw new Error('Mensagem é obrigatória');
    }

    // Get financial context
    const context = await getFinancialContext(supabaseClient, user.id);

    // Save user message
    await supabaseClient.from('ai_conversations').insert({
      restaurant_id: user.id,
      role: 'user',
      content: message
    });

    const systemPrompt = `Você é uma IA especialista em gestão financeira, controladoria e operações de delivery/restaurantes.
Seu objetivo é analisar dados financeiros e operacionais, identificar problemas, prever riscos e recomendar ações claras para aumentar lucro e reduzir desperdício.

CONTEXTO FINANCEIRO ATUAL DO RESTAURANTE (últimos 30 dias):
- Receita Total: R$ ${context.totalRevenue.toFixed(2)}
- Despesas Totais: R$ ${context.totalExpenses.toFixed(2)}
- Lucro Bruto: R$ ${context.grossProfit.toFixed(2)}
- Lucro Líquido: R$ ${context.netProfit.toFixed(2)}
- Fluxo de Caixa: R$ ${context.cashFlow.toFixed(2)}
- Contas a Pagar (pendentes): R$ ${context.pendingPayables.toFixed(2)}
- Contas a Pagar (vencidas): R$ ${context.overduePayables.toFixed(2)}
- Contas a Receber: R$ ${context.pendingReceivables.toFixed(2)}
- Pedidos Realizados: ${context.recentOrders}
- Ticket Médio: R$ ${context.avgTicket.toFixed(2)}
- Taxa de Cancelamento: ${context.cancellationRate.toFixed(1)}%

PRODUTOS MAIS VENDIDOS:
${context.topProducts.map(p => `- ${p.name}: R$ ${p.revenue.toFixed(2)} (margem: ${p.margin.toFixed(1)}%)`).join('\n') || 'Sem dados'}

PRODUTOS COM MENOR PERFORMANCE:
${context.lowProducts.map(p => `- ${p.name}: R$ ${p.revenue.toFixed(2)} (margem: ${p.margin.toFixed(1)}%)`).join('\n') || 'Sem dados'}

ALERTAS DE ESTOQUE:
${context.inventoryAlerts.map(i => `- ${i.name}: ${i.current} unidades (mínimo: ${i.min})`).join('\n') || 'Nenhum alerta'}

SUAS RESPONSABILIDADES:
1. GESTÃO FINANCEIRA: Analise fluxo de caixa, lucro, margens, contas a pagar/receber
2. CONTROLE DE ESTOQUE: Identifique produtos em falta, parados ou com baixa saída
3. ANÁLISE DE CARDÁPIO: Identifique produtos lucrativos/não lucrativos, sugira preços
4. RECOMENDAÇÕES ESTRATÉGICAS: Seja direto e decisivo:
   - "Você está perdendo dinheiro por causa de X"
   - "Esse produto deveria ser removido"
   - "Se continuar assim, em X dias o caixa quebra"
   - "Essa ação pode aumentar o lucro em X%"
5. DIAGNÓSTICO DE SAÚDE: Dê um score de 0-100 para a saúde do negócio

REGRAS:
- Seja DIRETO e PRÁTICO - não apenas informe, DECIDA E RECOMENDE
- Sempre inclua IMPACTO FINANCEIRO ESTIMADO nas recomendações
- Use dados concretos do contexto acima
- Priorize problemas: GRAVE / MÉDIO / LEVE
- Responda sempre em português brasileiro
- Seja objetivo e conciso`;

    const messages = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ];

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: messages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error('Erro ao comunicar com a IA');
    }

    const geminiData = await geminiResponse.json();
    const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 
      'Desculpe, não consegui processar sua solicitação.';

    // Save AI response
    await supabaseClient.from('ai_conversations').insert({
      restaurant_id: user.id,
      role: 'assistant',
      content: aiResponse
    });

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        context: {
          healthScore: calculateHealthScore(context),
          alerts: generateAlerts(context)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in financial-ai-chat:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateHealthScore(context: FinancialContext): number {
  let score = 100;

  // Profitability (30 points)
  if (context.netProfit < 0) score -= 30;
  else if (context.netProfit < context.totalRevenue * 0.1) score -= 15;
  else if (context.netProfit < context.totalRevenue * 0.2) score -= 5;

  // Cash flow (20 points)
  if (context.cashFlow < 0) score -= 20;
  else if (context.cashFlow < context.totalExpenses * 0.5) score -= 10;

  // Overdue payables (15 points)
  if (context.overduePayables > 0) {
    score -= Math.min(15, context.overduePayables / 100);
  }

  // Cancellation rate (15 points)
  if (context.cancellationRate > 10) score -= 15;
  else if (context.cancellationRate > 5) score -= 10;
  else if (context.cancellationRate > 2) score -= 5;

  // Inventory alerts (10 points)
  score -= Math.min(10, context.inventoryAlerts.length * 2);

  // Order volume (10 points)
  if (context.recentOrders < 10) score -= 10;
  else if (context.recentOrders < 30) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function generateAlerts(context: FinancialContext): string[] {
  const alerts: string[] = [];

  if (context.netProfit < 0) {
    alerts.push(`⚠️ CRÍTICO: Prejuízo de R$ ${Math.abs(context.netProfit).toFixed(2)} nos últimos 30 dias`);
  }

  if (context.overduePayables > 0) {
    alerts.push(`🔴 R$ ${context.overduePayables.toFixed(2)} em contas VENCIDAS`);
  }

  if (context.cashFlow < 0) {
    alerts.push(`💸 Fluxo de caixa negativo: R$ ${context.cashFlow.toFixed(2)}`);
  }

  if (context.cancellationRate > 10) {
    alerts.push(`📉 Taxa de cancelamento alta: ${context.cancellationRate.toFixed(1)}%`);
  }

  context.inventoryAlerts.forEach(item => {
    alerts.push(`📦 Estoque baixo: ${item.name} (${item.current}/${item.min})`);
  });

  return alerts;
}
