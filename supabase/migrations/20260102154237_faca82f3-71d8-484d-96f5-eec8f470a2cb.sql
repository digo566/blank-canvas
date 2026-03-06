-- Tabela de categorias de despesas
CREATE TABLE public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fixed', 'variable')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners can manage their expense categories"
ON public.expense_categories FOR ALL
USING (auth.uid() = restaurant_id);

-- Tabela de despesas/custos
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN DEFAULT false,
  recurring_day INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners can manage their expenses"
ON public.expenses FOR ALL
USING (auth.uid() = restaurant_id);

-- Tabela de contas a pagar
CREATE TABLE public.accounts_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  supplier_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners can manage their accounts payable"
ON public.accounts_payable FOR ALL
USING (auth.uid() = restaurant_id);

-- Tabela de contas a receber
CREATE TABLE public.accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  received_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'overdue')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners can manage their accounts receivable"
ON public.accounts_receivable FOR ALL
USING (auth.uid() = restaurant_id);

-- Tabela de inventário/estoque
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  ingredient_name TEXT,
  current_quantity NUMERIC NOT NULL DEFAULT 0,
  min_quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'un',
  unit_cost NUMERIC DEFAULT 0,
  last_purchase_date DATE,
  avg_daily_consumption NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners can manage their inventory"
ON public.inventory FOR ALL
USING (auth.uid() = restaurant_id);

-- Tabela de movimentações de estoque
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL,
  quantity NUMERIC NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  unit_cost NUMERIC,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners can manage their inventory movements"
ON public.inventory_movements FOR ALL
USING (auth.uid() = restaurant_id);

-- Tabela de resumos financeiros (diário/semanal/mensal)
CREATE TABLE public.financial_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_revenue NUMERIC DEFAULT 0,
  total_expenses NUMERIC DEFAULT 0,
  gross_profit NUMERIC DEFAULT 0,
  net_profit NUMERIC DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  avg_ticket NUMERIC DEFAULT 0,
  health_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.financial_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners can manage their financial summaries"
ON public.financial_summaries FOR ALL
USING (auth.uid() = restaurant_id);

-- Tabela de conversas com IA
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners can manage their AI conversations"
ON public.ai_conversations FOR ALL
USING (auth.uid() = restaurant_id);

-- Trigger para atualizar updated_at do inventário
CREATE TRIGGER update_inventory_updated_at
BEFORE UPDATE ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();