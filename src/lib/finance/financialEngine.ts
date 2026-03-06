import { supabase } from "@/integrations/supabase/client";
import type { FinancialMetrics, ProductAnalysis, FinancialAlert, BusinessHealthDiagnosis } from "./types";

export async function calculateFinancialMetrics(restaurantId: string, days: number = 30): Promise<FinancialMetrics> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  // Fetch orders
  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*, product:products(name, cost_price, price))')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', startDateStr);

  // Fetch expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .gte('expense_date', startDateStr);

  // Fetch payables
  const { data: payables } = await supabase
    .from('accounts_payable')
    .select('*')
    .eq('restaurant_id', restaurantId);

  // Fetch receivables
  const { data: receivables } = await supabase
    .from('accounts_receivable')
    .select('*')
    .eq('restaurant_id', restaurantId);

  const completedOrders = orders?.filter(o => o.status === 'delivered') || [];
  const cancelledOrders = orders?.filter(o => o.status === 'cancelled') || [];

  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const totalExpenses = (expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);

  // Calculate product costs
  let productCosts = 0;
  completedOrders.forEach(order => {
    (order.order_items as any[])?.forEach(item => {
      productCosts += ((item.product as any)?.cost_price || 0) * item.quantity;
    });
  });

  const grossProfit = totalRevenue - productCosts;
  const netProfit = grossProfit - totalExpenses;

  const pendingPayables = (payables || [])
    .filter(p => p.status !== 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const overduePayables = (payables || [])
    .filter(p => p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingReceivables = (receivables || [])
    .filter(r => r.status !== 'received')
    .reduce((sum, r) => sum + r.amount, 0);

  const avgTicket = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
  const cancellationRate = orders && orders.length > 0 
    ? (cancelledOrders.length / orders.length) * 100 
    : 0;

  const healthScore = calculateHealthScore({
    netProfit,
    totalRevenue,
    totalExpenses,
    overduePayables,
    cancellationRate,
    orderCount: completedOrders.length
  });

  return {
    totalRevenue,
    totalExpenses,
    grossProfit,
    netProfit,
    cashFlow: grossProfit - pendingPayables + pendingReceivables,
    pendingPayables,
    overduePayables,
    pendingReceivables,
    healthScore,
    avgTicket,
    totalOrders: completedOrders.length,
    cancellationRate
  };
}

function calculateHealthScore(params: {
  netProfit: number;
  totalRevenue: number;
  totalExpenses: number;
  overduePayables: number;
  cancellationRate: number;
  orderCount: number;
}): number {
  let score = 100;

  // Profitability (30 points)
  if (params.netProfit < 0) score -= 30;
  else if (params.netProfit < params.totalRevenue * 0.1) score -= 15;
  else if (params.netProfit < params.totalRevenue * 0.2) score -= 5;

  // Overdue payables (20 points)
  if (params.overduePayables > 0) {
    score -= Math.min(20, params.overduePayables / 50);
  }

  // Cancellation rate (15 points)
  if (params.cancellationRate > 10) score -= 15;
  else if (params.cancellationRate > 5) score -= 10;
  else if (params.cancellationRate > 2) score -= 5;

  // Order volume (10 points)
  if (params.orderCount < 10) score -= 10;
  else if (params.orderCount < 30) score -= 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function analyzeProducts(restaurantId: string, days: number = 30): Promise<ProductAnalysis[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*, product:products(name, cost_price, price))')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'delivered')
    .gte('created_at', startDateStr);

  const productMap: Record<string, ProductAnalysis> = {};

  orders?.forEach(order => {
    (order.order_items as any[])?.forEach(item => {
      const name = (item.product as any)?.name || 'Desconhecido';
      const cost = ((item.product as any)?.cost_price || 0) * item.quantity;
      const revenue = item.subtotal || 0;

      if (!productMap[name]) {
        productMap[name] = { name, revenue: 0, cost: 0, margin: 0, quantity: 0, trend: 'stable' };
      }

      productMap[name].revenue += revenue;
      productMap[name].cost += cost;
      productMap[name].quantity += item.quantity;
    });
  });

  return Object.values(productMap)
    .map(p => ({
      ...p,
      margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export async function generateFinancialAlerts(restaurantId: string): Promise<FinancialAlert[]> {
  const metrics = await calculateFinancialMetrics(restaurantId);
  const alerts: FinancialAlert[] = [];

  if (metrics.netProfit < 0) {
    alerts.push({
      type: 'critical',
      title: 'Prejuízo Detectado',
      message: `Você está operando com prejuízo de R$ ${Math.abs(metrics.netProfit).toFixed(2)}`,
      action: 'Revise custos e precificação imediatamente',
      impact: 'Se continuar assim, a empresa pode ter problemas graves de caixa'
    });
  }

  if (metrics.overduePayables > 0) {
    alerts.push({
      type: 'critical',
      title: 'Contas Vencidas',
      message: `R$ ${metrics.overduePayables.toFixed(2)} em contas vencidas`,
      action: 'Negocie prazos ou priorize esses pagamentos',
      impact: 'Pode afetar crédito e relacionamento com fornecedores'
    });
  }

  if (metrics.cashFlow < 0) {
    alerts.push({
      type: 'warning',
      title: 'Fluxo de Caixa Negativo',
      message: `Fluxo de caixa: R$ ${metrics.cashFlow.toFixed(2)}`,
      action: 'Revise despesas e acelere recebíveis',
      impact: 'Risco de não conseguir honrar compromissos'
    });
  }

  if (metrics.cancellationRate > 10) {
    alerts.push({
      type: 'warning',
      title: 'Taxa de Cancelamento Alta',
      message: `${metrics.cancellationRate.toFixed(1)}% dos pedidos cancelados`,
      action: 'Investigue motivos dos cancelamentos',
      impact: 'Perda de receita e possível insatisfação'
    });
  }

  // Check inventory
  const { data: inventory } = await supabase
    .from('inventory')
    .select('*')
    .eq('restaurant_id', restaurantId);

  const lowStock = inventory?.filter(i => i.current_quantity <= i.min_quantity) || [];
  if (lowStock.length > 0) {
    alerts.push({
      type: 'warning',
      title: 'Estoque Baixo',
      message: `${lowStock.length} itens precisam de reposição`,
      action: 'Faça pedido de compra para evitar falta',
      impact: 'Pode interromper produção ou vendas'
    });
  }

  return alerts;
}

export async function generateBusinessDiagnosis(restaurantId: string): Promise<BusinessHealthDiagnosis> {
  const metrics = await calculateFinancialMetrics(restaurantId);
  const products = await analyzeProducts(restaurantId);
  const alerts = await generateFinancialAlerts(restaurantId);

  const { data: inventory } = await supabase
    .from('inventory')
    .select('*')
    .eq('restaurant_id', restaurantId);

  // Calculate component scores
  const financialHealth = metrics.netProfit >= 0 ? 
    Math.min(100, 50 + (metrics.netProfit / metrics.totalRevenue) * 200) : 
    Math.max(0, 50 + (metrics.netProfit / (metrics.totalExpenses || 1)) * 100);

  const operationalHealth = 100 - metrics.cancellationRate * 5;

  const lowStockCount = inventory?.filter(i => i.current_quantity <= i.min_quantity).length || 0;
  const inventoryHealth = Math.max(0, 100 - lowStockCount * 10);

  const score = Math.round((financialHealth + operationalHealth + inventoryHealth) / 3);

  const status: BusinessHealthDiagnosis['status'] = 
    score >= 80 ? 'excellent' :
    score >= 60 ? 'good' :
    score >= 40 ? 'attention' : 'critical';

  const recommendations: string[] = [];
  const checklist: BusinessHealthDiagnosis['checklist'] = [];

  // Generate recommendations based on analysis
  if (metrics.netProfit < 0) {
    recommendations.push('Urgente: Revise sua estrutura de custos e preços');
    checklist.push({ item: 'Analisar margem de cada produto', priority: 'high', completed: false });
    checklist.push({ item: 'Identificar despesas que podem ser cortadas', priority: 'high', completed: false });
  }

  if (metrics.overduePayables > 0) {
    recommendations.push('Regularize contas vencidas para manter crédito');
    checklist.push({ item: 'Negociar prazos com fornecedores', priority: 'high', completed: false });
  }

  const lowMarginProducts = products.filter(p => p.margin < 20 && p.quantity > 5);
  if (lowMarginProducts.length > 0) {
    recommendations.push(`${lowMarginProducts.length} produtos têm margem abaixo de 20% - considere ajustar preços`);
    checklist.push({ item: 'Revisar preços de produtos com margem baixa', priority: 'medium', completed: false });
  }

  if (lowStockCount > 0) {
    recommendations.push(`${lowStockCount} itens precisam de reposição urgente`);
    checklist.push({ item: 'Fazer pedido de compra', priority: 'high', completed: false });
  }

  if (metrics.cancellationRate > 5) {
    recommendations.push('Investigue os motivos de cancelamento dos pedidos');
    checklist.push({ item: 'Analisar feedback de clientes', priority: 'medium', completed: false });
  }

  return {
    score,
    status,
    financialHealth: Math.round(financialHealth),
    operationalHealth: Math.round(operationalHealth),
    inventoryHealth: Math.round(inventoryHealth),
    recommendations,
    checklist
  };
}
