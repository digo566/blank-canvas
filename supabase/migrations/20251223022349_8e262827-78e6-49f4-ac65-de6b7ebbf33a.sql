-- 🔒 Fechar acesso público às tabelas sensíveis (PII + pedidos)
-- Mantém apenas acesso de restaurante (auth) / cliente logado / admin.

-- clients: remover políticas públicas
DROP POLICY IF EXISTS "Public can insert clients for orders" ON public.clients;
DROP POLICY IF EXISTS "Public can check existing clients" ON public.clients;
DROP POLICY IF EXISTS "Public can update clients during checkout" ON public.clients;

-- carts: remover políticas públicas
DROP POLICY IF EXISTS "Public can insert carts for orders" ON public.carts;
DROP POLICY IF EXISTS "Public can view carts" ON public.carts;
DROP POLICY IF EXISTS "Public can update carts" ON public.carts;

-- orders: remover criação pública
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;

-- order_items: remover criação pública
DROP POLICY IF EXISTS "Public can create order items" ON public.order_items;

-- order_item_options: remover criação pública
DROP POLICY IF EXISTS "Anyone can create order item options" ON public.order_item_options;
