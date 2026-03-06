-- Adicionar campo de observações aos pedidos
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes text;

-- Criar tabela para grupos de opções de produtos (ex: "Tamanho", "Adicionais")
CREATE TABLE IF NOT EXISTS public.product_option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_required boolean DEFAULT false,
  min_selections integer DEFAULT 0,
  max_selections integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Criar tabela para itens dentro dos grupos de opções (ex: "Pequeno", "Médio", "Grande")
CREATE TABLE IF NOT EXISTS public.product_option_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_group_id uuid NOT NULL REFERENCES public.product_option_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_modifier numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Criar tabela para armazenar as opções selecionadas em cada item do pedido
CREATE TABLE IF NOT EXISTS public.order_item_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  option_item_id uuid NOT NULL REFERENCES public.product_option_items(id),
  option_item_name text NOT NULL,
  price_modifier numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_options ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para product_option_groups
CREATE POLICY "Anyone can view product option groups"
ON public.product_option_groups FOR SELECT
USING (true);

CREATE POLICY "Restaurant owners can manage their product options"
ON public.product_option_groups FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.products
  WHERE products.id = product_option_groups.product_id
  AND products.restaurant_id = auth.uid()
));

-- Políticas RLS para product_option_items
CREATE POLICY "Anyone can view product option items"
ON public.product_option_items FOR SELECT
USING (true);

CREATE POLICY "Restaurant owners can manage their option items"
ON public.product_option_items FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.product_option_groups
  JOIN public.products ON products.id = product_option_groups.product_id
  WHERE product_option_groups.id = product_option_items.option_group_id
  AND products.restaurant_id = auth.uid()
));

-- Políticas RLS para order_item_options
CREATE POLICY "Anyone can create order item options"
ON public.order_item_options FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their order item options"
ON public.order_item_options FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.order_items
  JOIN public.orders ON orders.id = order_items.order_id
  WHERE order_items.id = order_item_options.order_item_id
  AND (orders.restaurant_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = orders.client_id
    AND clients.user_id = auth.uid()
  ))
));