-- Update clients table to support authentication
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email text;

-- Update RLS policies for clients
DROP POLICY IF EXISTS "Restaurant owners can manage their clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can view all clients" ON public.clients;

CREATE POLICY "Restaurant owners can manage their clients" 
ON public.clients 
FOR ALL 
USING (auth.uid() = restaurant_id);

CREATE POLICY "Clients can view and update their own data" 
ON public.clients 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all clients" 
ON public.clients 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update RLS policies for orders to allow clients to view their own orders
DROP POLICY IF EXISTS "Restaurant owners can manage their orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;

CREATE POLICY "Restaurant owners can manage their orders" 
ON public.orders 
FOR ALL 
USING (auth.uid() = restaurant_id);

CREATE POLICY "Clients can view their own orders" 
ON public.orders 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = orders.client_id 
    AND clients.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all orders" 
ON public.orders 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update RLS for order_items to allow clients to view their order items
DROP POLICY IF EXISTS "Order items inherit order permissions" ON public.order_items;

CREATE POLICY "Order items inherit order permissions" 
ON public.order_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id 
    AND (
      orders.restaurant_id = auth.uid() 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.clients 
        WHERE clients.id = orders.client_id 
        AND clients.user_id = auth.uid()
      )
    )
  )
);