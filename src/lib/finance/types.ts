export interface Expense {
  id: string;
  restaurant_id: string;
  category_id?: string;
  amount: number;
  description?: string;
  expense_date: string;
  is_recurring: boolean;
  recurring_day?: number;
  created_at: string;
  category?: ExpenseCategory;
}

export interface ExpenseCategory {
  id: string;
  restaurant_id: string;
  name: string;
  type: 'fixed' | 'variable';
  created_at: string;
}

export interface AccountPayable {
  id: string;
  restaurant_id: string;
  supplier_name: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  status: 'pending' | 'paid' | 'overdue';
  description?: string;
  created_at: string;
}

export interface AccountReceivable {
  id: string;
  restaurant_id: string;
  client_name: string;
  amount: number;
  due_date: string;
  received_date?: string;
  status: 'pending' | 'received' | 'overdue';
  description?: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  restaurant_id: string;
  product_id?: string;
  ingredient_name?: string;
  current_quantity: number;
  min_quantity: number;
  unit: string;
  unit_cost: number;
  last_purchase_date?: string;
  avg_daily_consumption: number;
  created_at: string;
  updated_at: string;
  product?: {
    name: string;
  };
}

export interface InventoryMovement {
  id: string;
  inventory_id: string;
  restaurant_id: string;
  quantity: number;
  movement_type: 'in' | 'out' | 'adjustment';
  unit_cost?: number;
  reason?: string;
  created_at: string;
}

export interface FinancialSummary {
  id: string;
  restaurant_id: string;
  period_type: 'daily' | 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_expenses: number;
  gross_profit: number;
  net_profit: number;
  total_orders: number;
  avg_ticket: number;
  health_score: number;
  created_at: string;
}

export interface AIConversation {
  id: string;
  restaurant_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  cashFlow: number;
  pendingPayables: number;
  overduePayables: number;
  pendingReceivables: number;
  healthScore: number;
  avgTicket: number;
  totalOrders: number;
  cancellationRate: number;
}

export interface ProductAnalysis {
  name: string;
  revenue: number;
  cost: number;
  margin: number;
  quantity: number;
  trend: 'up' | 'down' | 'stable';
}

export interface FinancialAlert {
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  action?: string;
  impact?: string;
}

export interface BusinessHealthDiagnosis {
  score: number;
  status: 'excellent' | 'good' | 'attention' | 'critical';
  financialHealth: number;
  operationalHealth: number;
  inventoryHealth: number;
  recommendations: string[];
  checklist: {
    item: string;
    priority: 'high' | 'medium' | 'low';
    completed: boolean;
  }[];
}
