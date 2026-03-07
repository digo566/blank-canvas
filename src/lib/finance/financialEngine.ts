import { supabase } from "@/integrations/supabase/client";
import type { FinancialMetrics, ProductAnalysis, FinancialAlert, BusinessHealthDiagnosis } from "./types";

export async function calculateFinancialMetrics(restaurantId: string, days: number = 30): Promise<FinancialMetrics> {
  const startDate = new Date(); startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const [{ data: orders }, { data: expenses }, { data: payables }, { data: receivables }] = await Promise.all([
    supabase.from('orders').select('*, order_items(*, product:products(name, cost_price, price))').eq('restaurant_id', restaurantId).gte('created_at', startDateStr),
    supabase.from('expenses').select('*').eq('restaurant_id', restaurantId).gte('expense_date', startDateStr),
    supabase.from('accounts_payable').select('*').eq('restaurant_id', restaurantId),
    supabase.from('accounts_receivable').select('*').eq('restaurant_id', restaurantId),
  ]);

  const completed = orders?.filter(o => o.status === 'delivered') || [];
  const cancelled = orders?.filter(o => o.status === 'cancelled') || [];
  const totalRevenue = completed.reduce((s, o) => s + (o.total_amount || 0), 0);
  const totalExpenses = (expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
  let productCosts = 0;
  completed.forEach(o => { (o.order_items as any[])?.forEach(i => { productCosts += ((i.product as any)?.cost_price || 0) * i.quantity; }); });
  const grossProfit = totalRevenue - productCosts;
  const netProfit = grossProfit - totalExpenses;
  const pendingPayables = (payables || []).filter(p => p.status !== 'paid').reduce((s, p) => s + p.amount, 0);
  const overduePayables = (payables || []).filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount, 0);
  const pendingReceivables = (receivables || []).filter(r => r.status !== 'received').reduce((s, r) => s + r.amount, 0);
  const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0;
  const cancellationRate = orders?.length ? (cancelled.length / orders.length) * 100 : 0;

  let score = 100;
  if (netProfit < 0) score -= 30; else if (netProfit < totalRevenue * 0.1) score -= 15; else if (netProfit < totalRevenue * 0.2) score -= 5;
  if (overduePayables > 0) score -= Math.min(20, overduePayables / 50);
  if (cancellationRate > 10) score -= 15; else if (cancellationRate > 5) score -= 10; else if (cancellationRate > 2) score -= 5;
  if (completed.length < 10) score -= 10; else if (completed.length < 30) score -= 5;

  return { totalRevenue, totalExpenses, grossProfit, netProfit, cashFlow: grossProfit - pendingPayables + pendingReceivables, pendingPayables, overduePayables, pendingReceivables, healthScore: Math.max(0, Math.min(100, Math.round(score))), avgTicket, totalOrders: completed.length, cancellationRate };
}

export async function analyzeProducts(restaurantId: string, days: number = 30): Promise<ProductAnalysis[]> {
  const startDate = new Date(); startDate.setDate(startDate.getDate() - days);
  const { data: orders } = await supabase.from('orders').select('*, order_items(*, product:products(name, cost_price, price))').eq('restaurant_id', restaurantId).eq('status', 'delivered').gte('created_at', startDate.toISOString().split('T')[0]);
  const map: Record<string, ProductAnalysis> = {};
  orders?.forEach(o => { (o.order_items as any[])?.forEach(i => { const n = (i.product as any)?.name || 'Desconhecido'; const cost = ((i.product as any)?.cost_price || 0) * i.quantity; if (!map[n]) map[n] = { name: n, revenue: 0, cost: 0, margin: 0, quantity: 0, trend: 'stable' }; map[n].revenue += i.subtotal || 0; map[n].cost += cost; map[n].quantity += i.quantity; }); });
  return Object.values(map).map(p => ({ ...p, margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0 })).sort((a, b) => b.revenue - a.revenue);
}

export async function generateFinancialAlerts(restaurantId: string): Promise<FinancialAlert[]> {
  const metrics = await calculateFinancialMetrics(restaurantId);
  const alerts: FinancialAlert[] = [];
  if (metrics.netProfit < 0) alerts.push({ type: 'critical', title: 'Prejuízo Detectado', message: `Prejuízo de R$ ${Math.abs(metrics.netProfit).toFixed(2)}`, action: 'Revise custos e precificação' });
  if (metrics.overduePayables > 0) alerts.push({ type: 'critical', title: 'Contas Vencidas', message: `R$ ${metrics.overduePayables.toFixed(2)} em contas vencidas`, action: 'Negocie prazos' });
  if (metrics.cashFlow < 0) alerts.push({ type: 'warning', title: 'Fluxo de Caixa Negativo', message: `Fluxo: R$ ${metrics.cashFlow.toFixed(2)}`, action: 'Revise despesas' });
  if (metrics.cancellationRate > 10) alerts.push({ type: 'warning', title: 'Cancelamentos Altos', message: `${metrics.cancellationRate.toFixed(1)}% cancelados`, action: 'Investigue motivos' });
  const { data: inventory } = await supabase.from('inventory').select('*').eq('restaurant_id', restaurantId);
  const low = inventory?.filter(i => i.current_quantity <= i.min_quantity) || [];
  if (low.length > 0) alerts.push({ type: 'warning', title: 'Estoque Baixo', message: `${low.length} itens precisam reposição`, action: 'Faça pedido de compra' });
  return alerts;
}

export async function generateBusinessDiagnosis(restaurantId: string): Promise<BusinessHealthDiagnosis> {
  const [metrics, products] = await Promise.all([calculateFinancialMetrics(restaurantId), analyzeProducts(restaurantId)]);
  const { data: inventory } = await supabase.from('inventory').select('*').eq('restaurant_id', restaurantId);
  const financialHealth = metrics.netProfit >= 0 ? Math.min(100, 50 + (metrics.netProfit / metrics.totalRevenue) * 200) : Math.max(0, 50 + (metrics.netProfit / (metrics.totalExpenses || 1)) * 100);
  const operationalHealth = 100 - metrics.cancellationRate * 5;
  const lowStock = inventory?.filter(i => i.current_quantity <= i.min_quantity).length || 0;
  const inventoryHealth = Math.max(0, 100 - lowStock * 10);
  const score = Math.round((financialHealth + operationalHealth + inventoryHealth) / 3);
  const status: BusinessHealthDiagnosis['status'] = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'attention' : 'critical';
  const recommendations: string[] = []; const checklist: BusinessHealthDiagnosis['checklist'] = [];
  if (metrics.netProfit < 0) { recommendations.push('Urgente: Revise custos e preços'); checklist.push({ item: 'Analisar margem de cada produto', priority: 'high', completed: false }); }
  if (metrics.overduePayables > 0) { recommendations.push('Regularize contas vencidas'); checklist.push({ item: 'Negociar prazos', priority: 'high', completed: false }); }
  if (lowStock > 0) { recommendations.push(`${lowStock} itens precisam de reposição`); checklist.push({ item: 'Fazer pedido de compra', priority: 'high', completed: false }); }
  return { score, status, financialHealth: Math.round(financialHealth), operationalHealth: Math.round(operationalHealth), inventoryHealth: Math.round(inventoryHealth), recommendations, checklist };
}
